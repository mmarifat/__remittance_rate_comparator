import { DEFAULT_CORRIDOR } from "./corridors";
import type { History, HistoryRecord } from "./history";
import { HISTORY_BASE_URL } from "./site";

/**
 * Hourly history lives on the repository's `data` branch, one file per corridor, written by
 * .github/workflows/rate-history.yml (the last 30 days). Nothing about rates is kept in the database.
 */

/** A file changes once an hour, so one copy per server instance is good for 10 minutes. */
const KEEP_MS = 10 * 60_000;
const cache = new Map<string, { at: number; records: Promise<HistoryRecord[]> }>();

async function fetchRecords(corridorId: string): Promise<HistoryRecord[]> {
  // HISTORY_BASE_URL can point a fork (or local testing) at a different history folder.
  const base = process.env.HISTORY_BASE_URL ?? HISTORY_BASE_URL;
  const get = (url: string) => fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  try {
    let res = await get(`${base}/${corridorId}.json`);
    // Until the workflow's one-time move runs, GBP history is still the single file from before corridors.
    if (res.status === 404 && corridorId === DEFAULT_CORRIDOR) res = await get(`${base}.json`);
    if (!res.ok) return [];
    const body = (await res.json()) as Partial<History> | null;
    // A file in an unexpected shape counts as no history, rather than breaking every caller.
    return Array.isArray(body?.records) ? body.records : [];
  } catch {
    // No history yet, or GitHub unreachable: callers simply get none.
    return [];
  }
}

/** Every stored hourly record for a corridor (its main sending country), oldest first. */
export function loadHistory(corridorId: string): Promise<HistoryRecord[]> {
  const hit = cache.get(corridorId);
  if (hit && Date.now() - hit.at < KEEP_MS) return hit.records;
  const records = fetchRecords(corridorId);
  cache.set(corridorId, { at: Date.now(), records });
  // An empty answer may be an outage, so don't keep it around.
  records.then((r) => r.length === 0 && cache.delete(corridorId));
  return records;
}
