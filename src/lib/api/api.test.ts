import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setDbForTests, type Db } from "@/db/client";
import * as t from "@/db/schema";
import { createApiKey, createOrganization, usageByDay, utcDay } from "@/db/tenants";
import { testDb } from "@/db/testing";
import type { Corridor } from "../corridors";
import type { HistoryRecord } from "../history";
import type { ProviderResult, RatesSnapshot } from "../types";
import { compare, history, listCorridors, listProviders, rates, usage } from "./endpoints";
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

// The live check and the data-branch history stand in for real providers and GitHub.
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
const stored = vi.hoisted(() => ({ records: [] as HistoryRecord[] }));
vi.mock("@/lib/historySource", () => ({ loadHistory: async () => stored.records }));

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
  it("lists every corridor with its sending countries and which have history", async () => {
    const body = await (await call(listCorridors, "/api/v1/corridors")).json();
    const gbpPkr = body.corridors.find((c: { id: string }) => c.id === "GBP-PKR");
    expect(gbpPkr.receiveCountry).toEqual({ code: "PK", name: "Pakistan" });
    expect(gbpPkr.sendCountries[0]).toMatchObject({ code: "GB", default: true, history: true });
    const eurPkr = body.corridors.find((c: { id: string }) => c.id === "EUR-PKR");
    expect(eurPkr.sendCountries.find((c: { code: string }) => c.code === "ES")).toMatchObject({ history: false });
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

describe("history", () => {
  const hour = 3_600_000;
  beforeEach(() => {
    const base = Date.now() - 3 * hour;
    stored.records = [0, 1, 2].map((i) => ({
      t: new Date(base + i * hour).toISOString(),
      mid: 373 + i,
      r: { wise: 373 + i, remitly: 371, xe: 380, moneygram: null },
    }));
  });

  it("returns hourly series per provider and daily summaries, without excluded providers", async () => {
    const hourly = await (await call(history, "/api/v1/history?from=GBP&to=PKR&provider=wise")).json();
    expect(hourly).toMatchObject({ interval: "hour", corridor: "GBP-PKR", from: "GBP", to: "PKR" });
    expect(hourly.series).toEqual([{ provider: { id: "wise", name: "Wise" }, points: expect.any(Array) }]);
    expect(hourly.series[0].points).toHaveLength(3);
    expect(hourly.midMarket).toHaveLength(3);

    const all = await (await call(history, "/api/v1/history?corridor=GBP-PKR")).json();
    expect(all.series.map((s: { provider: { id: string } }) => s.provider.id)).toEqual(["moneygram", "remitly", "wise"]);
    expect(all.series[0].points).toEqual([]); // MoneyGram never answered

    const daily = await (await call(history, "/api/v1/history?corridor=GBP-PKR&interval=day")).json();
    const ids = daily.series.map((s: { provider: { id: string } }) => s.provider.id);
    expect(ids).toEqual(["moneygram", "remitly", "wise"]);
    expect(daily.series[0].points).toEqual([]);
    const wise = daily.series.find((s: { provider: { id: string } }) => s.provider.id === "wise");
    expect(wise.points.reduce((n: number, p: { samples: number }) => n + p.samples, 0)).toBe(3);
  });

  it("gives whole UTC days, and takes a date alone as the whole of that day", async () => {
    const today = utcDay(new Date());
    const daily = await (await call(history, "/api/v1/history?corridor=GBP-PKR&interval=day")).json();
    expect(daily.since).toBe(`${utcDay(new Date(Date.now() - 7 * 86_400_000))}T00:00:00.000Z`);
    expect(daily.limited).toBe(false);

    const sinceDay = utcDay(new Date(Date.now() - 2 * 86_400_000));
    const byDate = await (await call(history, `/api/v1/history?corridor=GBP-PKR&since=${sinceDay}&until=${today}`)).json();
    expect([byDate.since, byDate.until]).toEqual([`${sinceDay}T00:00:00.000Z`, `${today}T23:59:59.999Z`]);
    expect(byDate.series.find((s: { provider: { id: string } }) => s.provider.id === "wise").points.length).toBeGreaterThan(0);

    // A time is kept as given for hourly history, and widened to the whole day for daily history.
    const at = `${sinceDay}T10:30:00Z`;
    const hourly = await (await call(history, `/api/v1/history?corridor=GBP-PKR&since=${sinceDay}&until=${at}`)).json();
    expect(hourly.until).toBe(`${sinceDay}T10:30:00.000Z`);
    const daily2 = await (await call(history, `/api/v1/history?corridor=GBP-PKR&interval=day&since=${at}&until=${at}`)).json();
    expect([daily2.since, daily2.until]).toEqual([`${sinceDay}T00:00:00.000Z`, `${sinceDay}T23:59:59.999Z`]);
  });

  it("takes strict ISO 8601 dates, including an offset whose + wasn't encoded", async () => {
    const day = utcDay(new Date(Date.now() - 86_400_000));
    const offset = await (await call(history, `/api/v1/history?corridor=GBP-PKR&since=${day}T10:00:00+05:00`)).json();
    expect(offset.since).toBe(`${day}T05:00:00.000Z`);
    for (const bad of ["2026-02-30", "2026/10/31", `${day}T10:00`, "Nov 1 2026", "0"]) {
      const res = await call(history, `/api/v1/history?corridor=GBP-PKR&since=${encodeURIComponent(bad)}`);
      expect([res.status, (await res.json()).error.code]).toEqual([400, "invalid_since"]);
    }
  });

  it("covers the last 30 days, from the main sending country only", async () => {
    const body = await (await call(history, "/api/v1/history?corridor=GBP-PKR&interval=day&since=2020-01-01")).json();
    expect(body.limited).toBe(true);
    // History begins mid-day 30 days ago, so the first whole day starts the next midnight.
    expect(body.since).toBe(`${utcDay(new Date(Date.now() - 29 * 86_400_000))}T00:00:00.000Z`);

    const backwards = await call(history, "/api/v1/history?corridor=GBP-PKR&since=2026-11-03&until=2026-11-01");
    expect([backwards.status, (await backwards.json()).error.code]).toEqual([400, "invalid_range"]);
    const outside = await call(history, "/api/v1/history?corridor=GBP-PKR&since=2020-01-01&until=2020-06-01");
    expect([outside.status, (await outside.json()).error.code]).toEqual([400, "range_outside_history"]);
    const spain = await call(history, "/api/v1/history?corridor=EUR-PKR&country=ES");
    expect([spain.status, (await spain.json()).error.code]).toEqual([404, "not_tracked"]);
    const unknown = await call(history, "/api/v1/history?corridor=GBP-PKR&provider=nope");
    expect((await unknown.json()).error.code).toBe("invalid_provider");
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
