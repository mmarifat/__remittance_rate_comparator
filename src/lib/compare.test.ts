import { describe, expect, it } from "vitest";
import { availableMethods, buildOffers, mostTaka, pickQuote } from "./compare";
import type { ProviderResult, Quote, RatesSnapshot } from "./types";

const q = (sendAmount: number, rate: number, fee = 0, method: Quote["method"] = "bank"): Quote => ({
  sendAmount,
  rate,
  fee,
  method,
});

const provider = (id: string, quotes: Quote[], status: ProviderResult["status"] = "ok"): ProviderResult => ({
  id,
  name: id,
  url: `https://${id}.example`,
  domain: `${id}.example`,
  status,
  quotes,
});

const snapshot = (providers: ProviderResult[]): RatesSnapshot => ({
  corridor: "GBP-BDT",
  updatedAt: "2026-09-26T10:00:00Z",
  midMarket: 163,
  providers,
});

describe("pickQuote", () => {
  const tiers = [q(1000, 162), q(100, 160), q(500, 161)];

  it("uses the largest tier the amount reaches", () => {
    expect(pickQuote(tiers, 750, "bank")?.rate).toBe(161);
    expect(pickQuote(tiers, 1000, "bank")?.rate).toBe(162);
    expect(pickQuote(tiers, 5000, "bank")?.rate).toBe(162);
  });

  it("falls back to the smallest tier for tiny amounts", () => {
    expect(pickQuote(tiers, 20, "bank")?.rate).toBe(160);
  });

  it("ignores quotes for other delivery methods", () => {
    expect(pickQuote([q(100, 160, 0, "cash")], 100, "bank")).toBeUndefined();
  });
});

describe("buildOffers", () => {
  it("sorts by best rate, with fees taken out of the amount paid", () => {
    const offers = buildOffers(
      snapshot([
        provider("lower-rate-no-fee", [q(100, 162, 0)]), // 100 * 162 = 16200
        provider("high-rate-big-fee", [q(100, 165, 5)]), // (100 - 5) * 165 = 15675
      ]),
      100,
      "bank",
    );
    expect(offers.map((o) => o.provider.id)).toEqual(["high-rate-big-fee", "lower-rate-no-fee"]);
    expect(offers[0].receive).toBe(15675);
    expect(offers[0].effectiveRate).toBe(156.75);
    // ...but the fee means the lower rate actually delivers more taka.
    expect(mostTaka(offers)?.provider.id).toBe("lower-rate-no-fee");
  });

  it("never calls an offer with an unpublished fee the one with most taka", () => {
    const offers = buildOffers(
      snapshot([
        provider("fee-unknown", [{ ...q(100, 165, 0), feeUnknown: true }]),
        provider("known", [q(100, 162, 1)]),
      ]),
      100,
      "bank",
    );
    expect(offers[0].provider.id).toBe("fee-unknown");
    expect(mostTaka(offers)?.provider.id).toBe("known");
  });

  it("breaks rate ties by taka received", () => {
    const offers = buildOffers(
      snapshot([provider("fee", [q(100, 162, 1)]), provider("free", [q(100, 162, 0)])]),
      100,
      "bank",
    );
    expect(offers.map((o) => o.provider.id)).toEqual(["free", "fee"]);
  });

  it("drops offers whose fee swallows the whole amount", () => {
    expect(buildOffers(snapshot([provider("a", [q(100, 160, 3)])]), 3, "bank")).toEqual([]);
  });

  it("skips failed providers and returns nothing for invalid amounts", () => {
    const snap = snapshot([provider("ok", [q(100, 160)]), provider("down", [q(100, 170)], "error")]);
    expect(buildOffers(snap, 100, "bank").map((o) => o.provider.id)).toEqual(["ok"]);
    expect(buildOffers(snap, 0, "bank")).toEqual([]);
    expect(buildOffers(snap, Number.NaN, "bank")).toEqual([]);
  });
});

describe("availableMethods", () => {
  it("lists methods offered by working providers in a stable order", () => {
    const providers = [
      provider("a", [q(100, 160, 0, "cash"), q(100, 160, 0, "bank")]),
      provider("b", [q(100, 160, 0, "wallet")], "error"),
    ];
    expect(availableMethods(providers)).toEqual(["bank", "cash"]);
  });
});
