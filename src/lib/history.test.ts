import { describe, expect, it } from "vitest";
import {
  appendRecord,
  bestRateTrend,
  headlineRate,
  providerHealth,
  providerTrend,
  serializeHistory,
  toRecord,
  type HistoryRecord,
} from "./history";
import type { ProviderResult, Quote } from "./types";

const q = (sendAmount: number, rate: number, method: Quote["method"] = "bank"): Quote => ({
  sendAmount,
  rate,
  fee: 0,
  method,
});

const provider = (id: string, quotes: Quote[], status: ProviderResult["status"] = "ok"): ProviderResult => ({
  id,
  name: id,
  url: "",
  domain: "",
  status,
  quotes,
});

const rec = (t: string, r: HistoryRecord["r"]): HistoryRecord => ({ t, mid: 163, r });

describe("headlineRate", () => {
  it("uses the £1,000 bank quote, falling back to wallet", () => {
    expect(headlineRate(provider("a", [q(100, 160), q(1000, 162.123456)]))).toBe(162.1235);
    expect(headlineRate(provider("b", [q(1000, 161, "wallet")]))).toBe(161);
    expect(headlineRate(provider("c", [q(1000, 161)], "error"))).toBeNull();
  });
});

describe("toRecord", () => {
  it("keeps one rate per provider, null for failures", () => {
    const record = toRecord({
      updatedAt: "2026-09-26T10:00:00Z",
      midMarket: 163,
      providers: [provider("a", [q(1000, 162)]), provider("b", [], "error")],
    });
    expect(record).toEqual({ t: "2026-09-26T10:00:00Z", mid: 163, r: { a: 162, b: null } });
  });
});

describe("appendRecord", () => {
  it("skips a repeat of the same snapshot and drops records older than the window", () => {
    const old = rec("2026-08-01T00:00:00Z", { a: 160 });
    const last = rec("2026-09-26T09:00:00Z", { a: 162 });
    expect(appendRecord([old, last], last)).toEqual([old, last]);
    const next = rec("2026-09-26T10:00:00Z", { a: 162.5 });
    expect(appendRecord([old, last], next)).toEqual([last, next]);
  });
});

describe("serializeHistory", () => {
  it("writes one record per line and round-trips", () => {
    const history = { records: [rec("2026-09-26T09:00:00Z", { a: 162 }), rec("2026-09-26T10:00:00Z", { a: null })] };
    const text = serializeHistory(history);
    expect(text.split("\n")).toHaveLength(5);
    expect(JSON.parse(text)).toEqual(history);
  });
});

describe("providerHealth", () => {
  const hours = (n: number, r: HistoryRecord["r"]) =>
    Array.from({ length: n }, (_, i) => rec(`2026-09-26T${String(i).padStart(2, "0")}:00:00Z`, r));

  it("flags a provider only after it fails every one of the last checks", () => {
    const records = [...hours(5, { a: null, b: 162 }), rec("2026-09-26T06:00:00Z", { a: null, b: null })];
    expect(providerHealth(records, ["a", "b"])).toEqual({ down: ["a"], up: [] });
  });

  it("needs enough checks before calling anything down", () => {
    expect(providerHealth(hours(3, { a: null }), ["a"]).down).toEqual([]);
  });

  it("reports providers that answered in the latest check as up", () => {
    expect(providerHealth(hours(6, { a: 162, b: null }), ["a", "b"])).toEqual({ down: ["b"], up: ["a"] });
  });
});

describe("trends", () => {
  const now = Date.parse("2026-09-26T12:00:00Z");
  const records = [
    rec("2026-09-10T12:00:00Z", { a: 150, b: 151 }),
    rec("2026-09-25T12:00:00Z", { a: 162, b: null }),
    rec("2026-09-26T12:00:00Z", { a: 162.5, b: 163 }),
  ];

  it("returns a provider's answered checks within the window", () => {
    expect(providerTrend(records, "b", now)).toEqual([{ t: Date.parse("2026-09-26T12:00:00Z"), rate: 163 }]);
  });

  it("tracks the best rate at each check", () => {
    expect(bestRateTrend(records, now).map((p) => p.rate)).toEqual([162, 163]);
  });
});
