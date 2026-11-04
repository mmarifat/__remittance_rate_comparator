import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "./client";
import * as t from "./schema";
import { createApiKey, createOrganization, hashKey, recordRequest, revokeApiKey, setStatus, usageByDay } from "./tenants";
import { testDb } from "./testing";

let db: Db;
beforeEach(async () => {
  db = await testDb();
});

describe("API customers", () => {
  it("rejects unknown plans", async () => {
    await expect(createOrganization(db, { name: "Acme", plan: "platinum" })).rejects.toThrow("Unknown plan");
  });

  it("counts requests per key per minute and per organization per month", async () => {
    const org = await createOrganization(db, { name: "SonaliPay", plan: "pro" });
    const a = await createApiKey(db, { organizationId: org.id, name: "prod" });
    const b = await createApiKey(db, { organizationId: org.id, name: "staging" });
    expect(a.key).toMatch(/^rrc_live_[\w-]{32}$/);
    expect(a.prefix).toBe(a.key.slice(0, 15));

    const at = (iso: string) => new Date(iso);
    await recordRequest(db, hashKey(a.key), at("2026-10-31T23:59:00Z")); // last month: not counted
    await recordRequest(db, hashKey(a.key), at("2026-11-03T10:00:10Z"));
    await recordRequest(db, hashKey(b.key), at("2026-11-04T10:00:20Z"));
    const first = await recordRequest(db, hashKey(a.key), at("2026-11-04T10:00:30Z"));
    const second = await recordRequest(db, hashKey(a.key), at("2026-11-04T10:00:59Z"));
    const nextMinute = await recordRequest(db, hashKey(a.key), at("2026-11-04T10:01:00Z"));

    expect(first).toMatchObject({ organizationName: "SonaliPay", plan: "pro", minuteRequests: 1, monthRequests: 3 });
    expect(second).toMatchObject({ minuteRequests: 2, monthRequests: 4 });
    expect(second!.windowEndsAt.toISOString()).toBe("2026-11-04T10:01:00.000Z");
    expect(nextMinute).toMatchObject({ minuteRequests: 1, monthRequests: 5 });
    expect(await usageByDay(db, org.id, "2026-11-01")).toEqual([
      { day: "2026-11-03", requests: 1 },
      { day: "2026-11-04", requests: 4 },
    ]);
    // The rate-limit table keeps one row per key, however many minutes pass.
    expect(await db.select().from(t.apiRateWindows).where(eq(t.apiRateWindows.apiKeyId, a.id))).toHaveLength(1);
    // A request that arrives late counts towards the latest minute, rather than resetting it.
    expect(await recordRequest(db, hashKey(a.key), at("2026-11-04T10:00:59Z"))).toMatchObject({ minuteRequests: 2 });
    // Last-used is written at most once a minute: 10:01:00 is only 30s after the 10:00:30 write.
    const [key] = await db.select().from(t.apiKeys).where(eq(t.apiKeys.id, a.id));
    expect(key.lastUsedAt?.toISOString()).toBe("2026-11-04T10:00:30.000Z");
  });

  it("refuses revoked, expired and unknown keys, and reports suspended accounts without counting", async () => {
    const org = await createOrganization(db, { name: "Acme" });
    const live = await createApiKey(db, { organizationId: org.id, name: "live" });
    const expiring = await createApiKey(db, { organizationId: org.id, name: "old", expiresAt: new Date("2026-11-01T00:00:00Z") });
    const now = new Date("2026-11-04T10:00:00Z");

    expect(await recordRequest(db, hashKey("rrc_live_nope"), now)).toBeNull();
    expect(await recordRequest(db, hashKey(expiring.key), now)).toBeNull();

    await setStatus(db, org.id, "suspended");
    expect(await recordRequest(db, hashKey(live.key), now)).toMatchObject({ status: "suspended", minuteRequests: 0 });
    expect(await usageByDay(db, org.id, "2026-11-01")).toEqual([]);

    await setStatus(db, org.id, "active");
    expect(await revokeApiKey(db, live.id)).toBe(true);
    expect(await revokeApiKey(db, live.id)).toBe(false);
    expect(await recordRequest(db, hashKey(live.key), now)).toBeNull();
  });
});
