import { afterEach, describe, expect, it, vi } from "vitest";
import { loadHistory } from "./historySource";

const record = { t: "2026-11-04T10:00:00.000Z", mid: 373, r: { wise: 373 } };
const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

// Each test uses its own corridor, since loaded history is kept for the whole process.
describe("loadHistory", () => {
  it("keeps a corridor's records for a while", async () => {
    const fetch = vi.fn(async () => respond(200, { records: [record] }));
    vi.stubGlobal("fetch", fetch);
    expect(await loadHistory("USD-PKR")).toEqual([record]);
    expect(await loadHistory("USD-PKR")).toEqual([record]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("treats a file without a records list as no history, and doesn't keep that", async () => {
    const fetch = vi.fn(async () => respond(200, {}));
    vi.stubGlobal("fetch", fetch);
    expect(await loadHistory("CAD-PKR")).toEqual([]);
    fetch.mockImplementation(async () => respond(200, { records: null }));
    expect(await loadHistory("CAD-PKR")).toEqual([]);
    fetch.mockImplementation(async () => respond(200, { records: [record] }));
    expect(await loadHistory("CAD-PKR")).toEqual([record]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("gives no history when the file is missing or GitHub can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respond(404, "Not Found")));
    expect(await loadHistory("EUR-PKR")).toEqual([]);
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    expect(await loadHistory("EUR-PKR")).toEqual([]);
  });

  it("falls back to the single file from before corridors for GBP to BDT", async () => {
    const fetch = vi.fn(async (url: string) => (url.endsWith("/GBP-BDT.json") ? respond(404, "") : respond(200, { records: [record] })));
    vi.stubGlobal("fetch", fetch);
    expect(await loadHistory("GBP-BDT")).toEqual([record]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
