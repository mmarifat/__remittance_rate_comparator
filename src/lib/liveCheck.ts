import { getCache, waitUntil } from "@vercel/functions";
import type { Corridor } from "./corridors";
import { startCheck, toSnapshot, type Check } from "./snapshot";
import type { RatesSnapshot } from "./types";

/** Providers are asked about once per this many seconds per corridor and country; everyone in between shares the result. */
export const CACHE_SECONDS = 120;
const CACHE_MS = CACHE_SECONDS * 1000;

// Two layers, so the page and the API share checks:
// - In this server instance, concurrent and back-to-back callers share one check, even while it's running.
// - Across instances, through Vercel's Runtime Cache (regional, read by every function). An instance about
//   to check a corridor first leaves a marker there; others that find it wait for that check's result
//   instead of asking every provider again, and the finished check replaces the marker. Elsewhere (locally,
//   other hosts) the cache is in memory, so the first layer does the work.
// Each deployment has its own entries, so a deploy never replays checks made by the previous code.
const latest = new Map<string, { at: number; check: Promise<Check> }>();
const deployment = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || "local";
const store = getCache({ namespace: `rrc-rates-${deployment}` });

const STORE_TIMEOUT_MS = 1_000;
/** How long a marker holds; a check takes about 20 seconds at most, so a longer one means its instance went away. */
const CHECKING_SECONDS = 30;
const POLL_MS = 1_000;

interface Marker {
  checkingSince: string;
}

const keyOf = (corridor: Corridor) => `${corridor.id}:${corridor.sendCountry}`;
const isFresh = (startedAt: number) => Date.now() - startedAt <= CACHE_MS;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isSnapshot(value: unknown, corridor: Corridor): value is RatesSnapshot {
  const s = value as RatesSnapshot | null;
  return Boolean(
    s &&
      s.corridor === corridor.id &&
      s.sendCountry === corridor.sendCountry &&
      typeof s.updatedAt === "string" &&
      isFresh(Date.parse(s.updatedAt)) &&
      Array.isArray(s.providers),
  );
}

const isMarker = (value: unknown): value is Marker => typeof (value as Marker | null)?.checkingSince === "string";

/** What the cache holds for a corridor. Never throws or hangs: a cache problem reads as nothing there. */
async function read(corridor: Corridor): Promise<unknown> {
  try {
    return await Promise.race([store.get(keyOf(corridor)), sleep(STORE_TIMEOUT_MS).then(() => null)]);
  } catch {
    return null;
  }
}

async function write(corridor: Corridor, value: RatesSnapshot | Marker, ttl: number) {
  try {
    await Promise.race([store.set(keyOf(corridor), value, { ttl, name: `rates ${keyOf(corridor)}` }), sleep(STORE_TIMEOUT_MS)]);
  } catch (err) {
    console.warn(`[rates] couldn't share the ${keyOf(corridor)} check`, err);
  }
}

/** Shares a finished check, replacing the marker, until CACHE_SECONDS after it started. */
function remember(corridor: Corridor, snapshot: RatesSnapshot) {
  const ttl = Math.floor((Date.parse(snapshot.updatedAt) + CACHE_MS - Date.now()) / 1000);
  return ttl >= 1 ? write(corridor, snapshot, ttl) : Promise.resolve();
}

/** Another instance is checking: its result, once it's stored, or null if it doesn't arrive. */
async function awaitOthers(corridor: Corridor): Promise<RatesSnapshot | null> {
  const giveUp = Date.now() + CHECKING_SECONDS * 1000;
  while (Date.now() < giveUp) {
    await sleep(POLL_MS);
    const value = await read(corridor);
    if (isSnapshot(value, corridor)) return value;
    if (!isMarker(value)) return null;
  }
  return null;
}

/** A check made of a stored snapshot: every result is already settled. */
function replay(corridor: Corridor, snapshot: RatesSnapshot): Check {
  return {
    corridor,
    updatedAt: snapshot.updatedAt,
    midMarket: Promise.resolve(snapshot.midMarket),
    results: snapshot.providers.map((p) => Promise.resolve(p)),
  };
}

async function findOrStart(corridor: Corridor): Promise<Check> {
  const value = await read(corridor);
  if (isSnapshot(value, corridor)) return replay(corridor, value);
  if (isMarker(value)) {
    const theirs = await awaitOthers(corridor);
    if (theirs) return replay(corridor, theirs);
  }
  const check = startCheck(corridor);
  // The marker goes up once the check has really started, and the result replaces it once every provider
  // has answered (never before the marker's own write). waitUntil keeps the instance up for both on Vercel.
  const marked = write(corridor, { checkingSince: check.updatedAt }, CHECKING_SECONDS);
  waitUntil(Promise.all([toSnapshot(check), marked]).then(([s]) => remember(corridor, s)));
  return check;
}

/** The latest check for a corridor and sending country: shared if one started within CACHE_SECONDS, otherwise a new one. */
export function sharedCheck(corridor: Corridor): Promise<Check> {
  const key = keyOf(corridor);
  const hit = latest.get(key);
  if (hit && isFresh(hit.at)) return hit.check;
  const entry = { at: Date.now(), check: findOrStart(corridor) };
  latest.set(key, entry);
  // A stored check may already be a minute old: it expires CACHE_SECONDS after it started, not after it was found.
  entry.check.then(
    (check) => (entry.at = Math.min(entry.at, Date.parse(check.updatedAt))),
    () => latest.get(key) === entry && latest.delete(key),
  );
  return entry.check;
}
