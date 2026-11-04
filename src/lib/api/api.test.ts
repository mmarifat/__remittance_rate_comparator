import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setDbForTests, type Db } from "@/db/client";
import * as t from "@/db/schema";
import { createApiKey, createOrganization, usageByDay, utcDay } from "@/db/tenants";
import { testDb } from "@/db/testing";
import type { Corridor } from "../corridors";
import type { ProviderResult, RatesSnapshot } from "../types";
import { compare, listCorridors, listProviders, rates, usage } from "./endpoints";
import { apiRoute } from "./handler";

const ok = (id: string, rate: number, fee: number, extra: Partial<ProviderResult> = {}): ProviderResult => ({
  id,
  name: id,
  url: `https://${id}.example`,
  domain: `${id}.example`,
  status: "ok",
  quotes: [
    { sendAmount: 1, rate, fee, method: "bank" },
    { sendAmount: 1, rate: rate - 1, fee: 0, method: "wallet" },
  ],
  ...extra,
});

function snapshotAt(updatedAt: string): RatesSnapshot {
  return {
    corridor: "GBP-PKR",
    sendCountry: "GB",
    updatedAt,
    midMarket: 373,
    providers: [
      ok("wise", 373, 6.6),
      ok("remitly", 371, 0, { note: "New customers: 373.06 on the first £500" }),
      ok("xe", 380, 0), // excluded from the API by policy, so it must never appear
      { id: "moneygram", name: "MoneyGram", url: "https://moneygram.example", domain: "moneygram.example", status: "error", quotes: [], error: "HTTP 403" },
    ],
  };
}

// The live check stands in for real providers.
const live = vi.hoisted(() => ({ snapshot: undefined as RatesSnapshot | undefined, asked: [] as string[] }));
vi.mock("@/lib/liveCheck", () => ({
  sharedCheck: async (corridor: Corridor) => {
    live.asked.push(`${corridor.id}:${corridor.sendCountry}`);
    const snap = live.snapshot!;
    return {
      corridor,
      updatedAt: snap.updatedAt,
      midMarket: Promise.resolve(snap.midMarket),
      results: snap.providers.map((p) => Promise.resolve(p)),
    };
  },
}));

let db: Db;
let key: string;
let orgId: string;
let keyId: string;

beforeEach(async () => {
  db = await testDb();
  setDbForTests(db);
  const org = await createOrganization(db, { name: "Test Co" });
  const created = await createApiKey(db, { organizationId: org.id, name: "test" });
  [key, orgId, keyId] = [created.key, org.id, created.id];
});
afterEach(() => {
  setDbForTests(undefined);
  vi.useRealTimers();
});

const call = (handler: Parameters<typeof apiRoute>[0], path: string, headers: Record<string, string> = { authorization: `Bearer ${key}` }) =>
  apiRoute(handler)(new NextRequest(`http://localhost${path}`, { headers }));

describe("authentication", () => {
  it("asks for a key, rejects bad ones, and accepts X-API-Key too", async () => {
    const missing = await call(listCorridors, "/api/v1/corridors", {});
    expect(missing.status).toBe(401);
    expect(await missing.json()).toEqual({ error: { code: "missing_api_key", message: expect.any(String) } });

    const wrong = await call(listCorridors, "/api/v1/corridors", { authorization: "Bearer rrc_live_wrong" });
    expect(wrong.status).toBe(401);
    expect((await wrong.json()).error.code).toBe("invalid_api_key");

    const viaHeader = await call(listCorridors, "/api/v1/corridors", { "x-api-key": key });
    expect(viaHeader.status).toBe(200);
    expect(viaHeader.headers.get("cache-control")).toBe("private, no-store");
    expect(viaHeader.headers.get("x-ratelimit-limit")).toBe("30");
    expect(viaHeader.headers.get("x-ratelimit-remaining")).toBe("29");
  });

  it("refuses requests over the plan's per-minute limit, without counting them towards the month", async () => {
    // One minute for the whole burst, however long it takes.
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-04T10:00:15Z") });
    let last: Response | undefined;
    for (let i = 0; i < 32; i++) last = await call(listCorridors, "/api/v1/corridors");
    expect(last!.status).toBe(429);
    expect((await last!.json()).error.code).toBe("rate_limited");
    expect(Number(last!.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await usageByDay(db, orgId, "2000-01-01")).toEqual([{ day: "2026-11-04", requests: 30 }]);
  });

  it("refuses requests once the month's quota is used, saying when it resets", async () => {
    await db.insert(t.apiUsageDaily).values({ apiKeyId: keyId, organizationId: orgId, day: utcDay(new Date()), requests: 9_999 });
    const lastOne = await call(listCorridors, "/api/v1/corridors");
    expect([lastOne.status, lastOne.headers.get("x-quota-remaining")]).toEqual([200, "0"]);

    const res = await call(listCorridors, "/api/v1/corridors");
    expect([res.status, (await res.json()).error.code]).toEqual([429, "quota_exceeded"]);
    expect(res.headers.get("x-quota-remaining")).toBe("0");
    expect((await usageByDay(db, orgId, "2000-01-01"))[0].requests).toBe(10_000);

    // Past the minute's limit too, it still says the month is used up: retrying in a minute can't help.
    let last: Response | undefined;
    for (let i = 0; i < 31; i++) last = await call(listCorridors, "/api/v1/corridors");
    expect((await last!.json()).error.code).toBe("quota_exceeded");
    const reset = Number(res.headers.get("retry-after"));
    expect(reset).toBeGreaterThan(0);
    expect(reset).toBeLessThanOrEqual(31 * 86_400);
    expect(res.headers.get("x-quota-reset")).toBe(String(reset));
  });

  it("answers 503 when no database is configured", async () => {
    setDbForTests(undefined);
    const res = await call(listCorridors, "/api/v1/corridors");
    expect(res.status).toBe(503);
  });
});

describe("catalogue", () => {
  it("lists every corridor with its sending countries", async () => {
    const body = await (await call(listCorridors, "/api/v1/corridors")).json();
    const gbpPkr = body.corridors.find((c: { id: string }) => c.id === "GBP-PKR");
    expect(gbpPkr.receiveCountry).toEqual({ code: "PK", name: "Pakistan" });
    expect(gbpPkr.sendCountries[0]).toMatchObject({ code: "GB", default: true });
    const eurPkr = body.corridors.find((c: { id: string }) => c.id === "EUR-PKR");
    expect(eurPkr.sendCountries.find((c: { code: string }) => c.code === "ES")).toMatchObject({ default: false });
  });

  it("lists providers for a corridor, leaving out excluded ones", async () => {
    const body = await (await call(listProviders, "/api/v1/providers?corridor=CAD-PKR")).json();
    const ids = body.providers.map((p: { id: string }) => p.id);
    expect(ids).toContain("taptapsend");
    expect(ids).not.toContain("xe");
    expect(ids).not.toContain("sonalipay"); // Bangladesh only
  });

  it("treats a lone currency as an incomplete corridor rather than ignoring it", async () => {
    for (const q of ["to=PKR", "from=GBP"]) {
      const res = await call(listProviders, `/api/v1/providers?${q}`);
      expect([res.status, (await res.json()).error.code]).toEqual([400, "invalid_corridor"]);
    }
  });
});

describe("rates and compare", () => {
  beforeEach(() => {
    live.snapshot = snapshotAt("2026-11-04T10:23:00.000Z");
    live.asked = [];
  });

  it("checks the corridor live and leaves out excluded providers", async () => {
    const res = await call(rates, "/api/v1/rates?from=GBP&to=PKR");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ corridor: "GBP-PKR", sendCountry: "GB", receiveCountry: "PK", midMarket: 373, checkedAt: "2026-11-04T10:23:00.000Z" });
    expect(body.providers.map((p: { id: string }) => p.id).sort()).toEqual(["moneygram", "remitly", "wise"]);
    expect(body.providers.find((p: { id: string }) => p.id === "moneygram")).toMatchObject({ status: "error", error: "HTTP 403" });
    expect(live.asked).toEqual(["GBP-PKR:GB"]);
  });

  it("works from every sending country, not only the main one", async () => {
    const res = await call(rates, "/api/v1/rates?corridor=EUR-PKR&country=ES");
    expect(res.status).toBe(200);
    expect(live.asked).toEqual(["EUR-PKR:ES"]);
  });

  it("ranks providers for an amount, fees included", async () => {
    const body = await (await call(compare, "/api/v1/compare?corridor=GBP-PKR&amount=500")).json();
    expect(body.offers.map((o: { provider: { id: string } }) => o.provider.id)).toEqual(["wise", "remitly"]);
    expect(body.offers[0]).toMatchObject({ rank: 1, rate: 373, fee: 6.6, receive: Math.round((500 - 6.6) * 373 * 100) / 100 });
    expect(body.bestRate).toBe("wise");
    // Remitly's zero fee delivers more rupees than Wise's better rate on £500.
    expect(body.mostReceived).toBe("remitly");
    expect(body.notOffered).toEqual([{ id: "moneygram", name: "MoneyGram", reason: "unavailable" }]);
  });

  it("validates parameters before asking any provider", async () => {
    const cases: [string, string][] = [
      ["/api/v1/compare?corridor=GBP-PKR", "invalid_amount"],
      ["/api/v1/compare?corridor=GBP-PKR&amount=500&method=pigeon", "invalid_method"],
      ["/api/v1/compare?corridor=JPY-PKR&amount=500", "invalid_corridor"],
      ["/api/v1/rates?corridor=GBP-PKR&country=US", "invalid_country"],
    ];
    for (const [path, code] of cases) {
      const res = await call(path.startsWith("/api/v1/compare") ? compare : rates, path);
      expect([res.status, (await res.json()).error.code]).toEqual([400, code]);
    }
    expect(live.asked).toEqual([]);
  });
});

describe("usage", () => {
  it("reports this month's requests against the plan", async () => {
    await call(listCorridors, "/api/v1/corridors");
    const body = await (await call(usage, "/api/v1/usage")).json();
    expect(body.organization.name).toBe("Test Co");
    expect(body.plan).toMatchObject({ id: "free", requestsPerMonth: 10_000 });
    expect(body.month.requests).toBe(2);
  });
});
