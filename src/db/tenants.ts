import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, gt, gte, isNull, lt, or, sql } from "drizzle-orm";
import { isPlanId, planOf, type PlanId } from "../lib/api/plans";
import type { Db } from "./client";
import * as t from "./schema";

/** The UTC day a moment falls on, as "YYYY-MM-DD". */
export const utcDay = (d: Date) => d.toISOString().slice(0, 10);

export const KEY_PREFIX = "rrc_live_";

/** Keys carry 192 random bits, so a fast hash is the right tool: nothing to brute-force. */
export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** A new API key. `key` is shown to the customer once; only `hash` is stored. */
export function generateKey() {
  const key = `${KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
  return { key, prefix: key.slice(0, KEY_PREFIX.length + 6), hash: hashKey(key) };
}

export async function createOrganization(db: Db, { name, plan = "free" }: { name: string; plan?: string }) {
  if (!name.trim()) throw new Error("An organization needs a name");
  if (!isPlanId(plan)) throw new Error(`Unknown plan "${plan}"`);
  const [org] = await db.insert(t.organizations).values({ name: name.trim(), plan }).returning();
  return org;
}

export async function setPlan(db: Db, organizationId: string, plan: PlanId | string) {
  if (!isPlanId(plan)) throw new Error(`Unknown plan "${plan}"`);
  const [org] = await db.update(t.organizations).set({ plan }).where(eq(t.organizations.id, organizationId)).returning();
  return org;
}

export async function setStatus(db: Db, organizationId: string, status: "active" | "suspended") {
  const [org] = await db.update(t.organizations).set({ status }).where(eq(t.organizations.id, organizationId)).returning();
  return org;
}

export async function createApiKey(
  db: Db,
  { organizationId, name, expiresAt }: { organizationId: string; name: string; expiresAt?: Date },
) {
  const { key, prefix, hash } = generateKey();
  const [row] = await db
    .insert(t.apiKeys)
    .values({ organizationId, name, prefix, keyHash: hash, expiresAt: expiresAt ?? null })
    .returning({ id: t.apiKeys.id, prefix: t.apiKeys.prefix, name: t.apiKeys.name, expiresAt: t.apiKeys.expiresAt });
  return { key, ...row };
}

/** Revokes a key by its id. Returns whether a live key was revoked. */
export async function revokeApiKey(db: Db, keyId: string, now = new Date()): Promise<boolean> {
  const rows = await db
    .update(t.apiKeys)
    .set({ revokedAt: now })
    .where(and(eq(t.apiKeys.id, keyId), isNull(t.apiKeys.revokedAt)))
    .returning({ id: t.apiKeys.id });
  return rows.length > 0;
}

export async function listOrganizations(db: Db) {
  const [orgs, keys] = await Promise.all([
    db.select().from(t.organizations).orderBy(asc(t.organizations.createdAt)),
    db
      .select({
        id: t.apiKeys.id,
        organizationId: t.apiKeys.organizationId,
        name: t.apiKeys.name,
        prefix: t.apiKeys.prefix,
        createdAt: t.apiKeys.createdAt,
        lastUsedAt: t.apiKeys.lastUsedAt,
        expiresAt: t.apiKeys.expiresAt,
        revokedAt: t.apiKeys.revokedAt,
      })
      .from(t.apiKeys)
      .orderBy(asc(t.apiKeys.createdAt)),
  ]);
  return orgs.map((org) => ({ ...org, keys: keys.filter((k) => k.organizationId === org.id) }));
}

export interface RequestRecord {
  keyId: string;
  organizationId: string;
  organizationName: string;
  plan: string;
  status: "active" | "suspended";
  /** Requests by this key in the current minute, including this one and any refused. */
  minuteRequests: number;
  /** When the current minute's window ends. */
  windowEndsAt: Date;
  /** Requests the organization has used this UTC month, including this one unless it's refused. */
  monthRequests: number;
  /** Why the request must be refused, if it must: over the key's minute limit, or the month's quota is used up. */
  refused: "rate_limited" | "quota_exceeded" | null;
}

/**
 * Looks up a key by its hash and, if it's live and its organization active, checks this request
 * against the plan: the key's requests this minute, and the organization's this month. Every attempt
 * counts towards the minute, so retrying in a tight loop stays limited; only requests that aren't
 * refused count towards the month, so a misbehaving client can't use up its own quota with refusals.
 * Returns null for an unknown, revoked or expired key. Under concurrency the month can run over its
 * quota by about as many requests as are in flight at that moment.
 */
export async function recordRequest(db: Db, keyHash: string, now = new Date()): Promise<RequestRecord | null> {
  const [found] = await db
    .select({
      keyId: t.apiKeys.id,
      organizationId: t.organizations.id,
      organizationName: t.organizations.name,
      plan: t.organizations.plan,
      status: t.organizations.status,
      lastUsedAt: t.apiKeys.lastUsedAt,
    })
    .from(t.apiKeys)
    .innerJoin(t.organizations, eq(t.organizations.id, t.apiKeys.organizationId))
    .where(
      and(
        eq(t.apiKeys.keyHash, keyHash),
        isNull(t.apiKeys.revokedAt),
        or(isNull(t.apiKeys.expiresAt), gt(t.apiKeys.expiresAt, now)),
      ),
    )
    .limit(1);
  if (!found) return null;

  const { lastUsedAt, ...caller } = found;
  const windowStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
  const windowEndsAt = new Date(windowStart.getTime() + 60_000);
  const base = { ...caller, windowEndsAt };
  if (found.status !== "active") return { ...base, minuteRequests: 0, monthRequests: 0, refused: null };

  const day = utcDay(now);
  const monthStart = `${day.slice(0, 8)}01`;
  const [[minute], [month]] = await Promise.all([
    db
      .insert(t.apiRateWindows)
      .values({ apiKeyId: found.keyId, windowStart, requests: 1 })
      .onConflictDoUpdate({
        target: [t.apiRateWindows.apiKeyId, t.apiRateWindows.windowStart],
        set: { requests: sql`${t.apiRateWindows.requests} + 1` },
      })
      .returning({ requests: t.apiRateWindows.requests }),
    // Everything the organization has used this month, all keys, before this request.
    db
      .select({ total: sql<number>`coalesce(sum(${t.apiUsageDaily.requests}), 0)::int`.mapWith(Number) })
      .from(t.apiUsageDaily)
      .where(and(eq(t.apiUsageDaily.organizationId, found.organizationId), gte(t.apiUsageDaily.day, monthStart))),
    // Last-used is for the key list, so a minute's precision saves a write on most requests.
    !lastUsedAt || now.getTime() - lastUsedAt.getTime() > 60_000
      ? db.update(t.apiKeys).set({ lastUsedAt: now }).where(eq(t.apiKeys.id, found.keyId))
      : Promise.resolve(),
  ]);

  const plan = planOf(found.plan);
  // An exhausted month comes first: retrying after the minute resets can't help that.
  const refused =
    month.total >= plan.requestsPerMonth ? "quota_exceeded" : minute.requests > plan.requestsPerMinute ? "rate_limited" : null;
  if (refused) return { ...base, minuteRequests: minute.requests, monthRequests: month.total, refused };

  await db
    .insert(t.apiUsageDaily)
    .values({ apiKeyId: found.keyId, organizationId: found.organizationId, day, requests: 1 })
    .onConflictDoUpdate({
      target: [t.apiUsageDaily.apiKeyId, t.apiUsageDaily.day],
      set: { requests: sql`${t.apiUsageDaily.requests} + 1` },
    });
  return { ...base, minuteRequests: minute.requests, monthRequests: month.total + 1, refused: null };
}

/** An organization's requests per UTC day from `fromDay` on, all keys combined. */
export async function usageByDay(db: Db, organizationId: string, fromDay: string) {
  return db
    .select({ day: t.apiUsageDaily.day, requests: sql<number>`sum(${t.apiUsageDaily.requests})::int`.mapWith(Number) })
    .from(t.apiUsageDaily)
    .where(and(eq(t.apiUsageDaily.organizationId, organizationId), gte(t.apiUsageDaily.day, fromDay)))
    .groupBy(t.apiUsageDaily.day)
    .orderBy(asc(t.apiUsageDaily.day));
}

/** Rate-limit windows are only needed for the current minute; this clears out old ones. */
export async function pruneRateWindows(db: Db, before: Date): Promise<number> {
  const rows = await db
    .delete(t.apiRateWindows)
    .where(lt(t.apiRateWindows.windowStart, before))
    .returning({ apiKeyId: t.apiRateWindows.apiKeyId });
  return rows.length;
}
