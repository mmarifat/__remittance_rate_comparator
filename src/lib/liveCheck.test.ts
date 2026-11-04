import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCorridor, inCountry, type Corridor } from "./corridors";
import type { Check } from "./snapshot";
import type { RatesSnapshot } from "./types";

// Vercel's Runtime Cache, shared by every "instance" (each fresh import of liveCheck) in these tests.
const fake = vi.hoisted(() => {
  const entries = new Map<string, { value: unknown; expires: number }>();
  const state = {
    entries,
    reads: 0,
    hang: false,
    namespaces: [] as (string | undefined)[],
    pending: [] as Promise<unknown>[],
    async get(key: string) {
      state.reads++;
      if (state.hang) return new Promise(() => {});
      const e = entries.get(key);
      return e && e.expires > Date.now() ? structuredClone(e.value) : null;
    },
    async set(key: string, value: unknown, options?: { ttl?: number }) {
      entries.set(key, { value: structuredClone(value), expires: Date.now() + (options?.ttl ?? 3600) * 1000 });
    },
  };
  return state;
});
vi.mock("@vercel/functions", () => ({
  getCache: (options?: { namespace?: string }) => {
    fake.namespaces.push(options?.namespace);
    return { get: fake.get, set: fake.set };
  },
  waitUntil: (promise: Promise<unknown>) => void fake.pending.push(promise),
}));

// Stands in for asking real providers. A check finishes when `finish` is called, or at once if `instant`.
const checks = vi.hoisted(() => ({ started: [] as string[], instant: true, fail: false, finish: () => {} }));
vi.mock("./snapshot", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./snapshot")>()),
  startCheck: (corridor: Corridor): Check => {
    if (checks.fail) throw new Error("boom");
    checks.started.push(`${corridor.id}:${corridor.sendCountry}`);
    const done = checks.instant ? Promise.resolve() : new Promise<void>((resolve) => (checks.finish = resolve));
    return {
      corridor,
      updatedAt: new Date().toISOString(),
      midMarket: done.then(() => 373),
      results: [done.then(() => ({ id: "wise", name: "Wise", url: "", domain: "wise.com", status: "ok" as const, quotes: [] }))],
    };
  },
}));

/** A server instance: its own in-process checks, sharing the cache with the others. */
async function instance() {
  vi.resetModules();
  return (await import("./liveCheck")).sharedCheck;
}
const gbpPkr = inCountry(getCorridor("GBP-PKR")!, null);
const snapshot = (c: Corridor, updatedAt: Date): RatesSnapshot => ({
  corridor: c.id,
  sendCountry: c.sendCountry,
  updatedAt: updatedAt.toISOString(),
  midMarket: 1.5,
  providers: [{ id: "ria", name: "Ria", url: "", domain: "ria.com", status: "ok", quotes: [] }],
});
const flushStores = () => Promise.all(fake.pending.splice(0));

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-11-04T12:00:00Z") });
  fake.entries.clear();
  Object.assign(fake, { reads: 0, hang: false });
  Object.assign(checks, { started: [], instant: true, fail: false });
});
afterEach(() => vi.useRealTimers());

describe("sharedCheck", () => {
  it("shares one check between concurrent and back-to-back callers, then starts a new one", async () => {
    const sharedCheck = await instance();
    const [a, b] = await Promise.all([sharedCheck(gbpPkr), sharedCheck(gbpPkr)]);
    expect(a).toBe(b);
    vi.setSystemTime(Date.now() + 119_000);
    expect(await sharedCheck(gbpPkr)).toBe(a);
    expect(checks.started).toEqual(["GBP-PKR:GB"]);

    vi.setSystemTime(Date.now() + 2_000);
    expect(await sharedCheck(gbpPkr)).not.toBe(a);
    expect(checks.started).toHaveLength(2);
  });

  it("stores each finished check for the other instances, scoped to the deployment", async () => {
    const sharedCheck = await instance();
    await sharedCheck(gbpPkr);
    await flushStores();
    expect((fake.entries.get("GBP-PKR:GB")?.value as RatesSnapshot).providers.map((p) => p.id)).toEqual(["wise"]);
    expect(fake.namespaces.at(-1)).toBe("rrc-rates-local");
  });

  it("replays a check another instance finished, keeping it until two minutes after it started", async () => {
    await fake.set("GBP-PKR:GB", snapshot(gbpPkr, new Date(Date.now() - 100_000)), { ttl: 20 });
    const sharedCheck = await instance();
    const check = await sharedCheck(gbpPkr);
    expect(checks.started).toEqual([]);
    expect(await check.midMarket).toBe(1.5);
    expect((await Promise.all(check.results)).map((p) => p.id)).toEqual(["ria"]);

    // Ten seconds on, it's served from this instance without asking the cache again.
    const reads = fake.reads;
    vi.setSystemTime(Date.now() + 10_000);
    expect(await sharedCheck(gbpPkr)).toBe(check);
    expect(fake.reads).toBe(reads);

    // It started 100 seconds ago, so it's good for 20 seconds in all, not another two minutes.
    vi.setSystemTime(Date.now() + 15_000);
    await sharedCheck(gbpPkr);
    expect(checks.started).toEqual(["GBP-PKR:GB"]);
  });

  it("ignores a stored check that's too old or is for another sending country", async () => {
    const germany = inCountry(getCorridor("EUR-BDT")!, "DE");
    const spain = inCountry(getCorridor("EUR-BDT")!, "ES");
    await fake.set("EUR-BDT:DE", snapshot(germany, new Date(Date.now() - 130_000)), { ttl: 60 });
    await fake.set("EUR-BDT:ES", snapshot(inCountry(getCorridor("EUR-BDT")!, "IT"), new Date()), { ttl: 60 });
    const sharedCheck = await instance();
    await sharedCheck(germany);
    await sharedCheck(spain);
    expect(checks.started).toEqual(["EUR-BDT:DE", "EUR-BDT:ES"]);
  });

  it("waits for a check another instance is running instead of asking the providers again", async () => {
    checks.instant = false;
    const first = await instance();
    const second = await instance();
    const theirs = await first(gbpPkr);
    const mine = second(gbpPkr);

    await vi.advanceTimersByTimeAsync(3_000);
    checks.finish();
    await flushStores();
    await vi.advanceTimersByTimeAsync(1_000);
    expect((await mine).updatedAt).toBe(theirs.updatedAt);
    expect(checks.started).toEqual(["GBP-PKR:GB"]);
  });

  it("checks for itself when the other instance's check never arrives", async () => {
    await fake.set("GBP-PKR:GB", { checkingSince: new Date().toISOString() }, { ttl: 30 });
    const sharedCheck = await instance();
    const mine = sharedCheck(gbpPkr);
    await vi.advanceTimersByTimeAsync(29_000);
    expect(checks.started).toEqual([]);
    await vi.advanceTimersByTimeAsync(2_000);
    await mine;
    expect(checks.started).toEqual(["GBP-PKR:GB"]);
  });

  it("doesn't wait more than a second on a cache that doesn't answer", async () => {
    fake.hang = true;
    const sharedCheck = await instance();
    const mine = sharedCheck(gbpPkr);
    await vi.advanceTimersByTimeAsync(1_000);
    await mine;
    expect(checks.started).toEqual(["GBP-PKR:GB"]);
  });

  it("forgets a check that failed to start, so the next caller tries again", async () => {
    const sharedCheck = await instance();
    checks.fail = true;
    await expect(sharedCheck(gbpPkr)).rejects.toThrow("boom");
    checks.fail = false;
    await sharedCheck(gbpPkr);
    expect(checks.started).toEqual(["GBP-PKR:GB"]);
  });
});
