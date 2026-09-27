import { describe, expect, it } from "vitest";
import { homeFor, linkQuery, parseLink, type LinkState } from "./link";

describe("homeFor", () => {
  it("starts visitors on their own currency and country", () => {
    expect(homeFor("GB")).toEqual({ corridorId: "GBP-BDT", country: "GB" });
    expect(homeFor("it")).toEqual({ corridorId: "EUR-BDT", country: "IT" });
    expect(homeFor("ES")).toEqual({ corridorId: "EUR-BDT", country: "ES" });
    expect(homeFor("US")).toEqual({ corridorId: "USD-BDT", country: "US" });
    expect(homeFor("CA")).toEqual({ corridorId: "CAD-BDT", country: "CA" });
  });

  it("gives other eurozone visitors euro prices from Italy, and everyone else GBP", () => {
    expect(homeFor("NL")).toEqual({ corridorId: "EUR-BDT", country: "IT" });
    expect(homeFor("BD")).toEqual({ corridorId: "GBP-BDT", country: "GB" });
    expect(homeFor(null)).toEqual({ corridorId: "GBP-BDT", country: "GB" });
  });
});

describe("parseLink", () => {
  const spain = homeFor("ES");

  it("uses the visitor's home when the address says nothing", () => {
    expect(parseLink({}, spain)).toEqual({
      corridorId: "EUR-BDT",
      country: "ES",
      amount: "1000",
      method: "bank",
      newCustomer: false,
    });
  });

  it("lets a shared link override the visitor's home, from that currency's default country", () => {
    expect(parseLink({ from: "USD", amount: "250", method: "wallet", new: "1" }, spain)).toEqual({
      corridorId: "USD-BDT",
      country: "US",
      amount: "250",
      method: "wallet",
      newCustomer: true,
    });
    expect(parseLink({ from: "EUR", country: "DE" }, homeFor("GB"))).toMatchObject({ corridorId: "EUR-BDT", country: "DE" });
  });

  it("ignores values it can't use", () => {
    expect(parseLink({ from: "XYZ", country: "US", amount: "abc", method: "pigeon" }, spain)).toMatchObject({
      corridorId: "EUR-BDT",
      country: "ES",
      amount: "1000",
      method: "bank",
    });
  });
});

describe("linkQuery", () => {
  const italy = homeFor("IT");
  const state = (overrides: Partial<LinkState>): LinkState => ({ ...parseLink({}, italy), ...overrides });

  it("leaves out whatever matches the visitor's home", () => {
    expect(linkQuery(state({}), italy)).toBe("");
    expect(linkQuery(state({ country: "FR", amount: "500" }), italy)).toBe("country=FR&amount=500");
  });

  it("writes out a currency that differs from home, so a reload keeps it", () => {
    expect(linkQuery(state({ corridorId: "GBP-BDT", country: "GB" }), italy)).toBe("from=GBP");
  });

  it("round-trips through parseLink", () => {
    const s = state({ corridorId: "USD-BDT", country: "US", method: "cash", newCustomer: true });
    expect(parseLink(Object.fromEntries(new URLSearchParams(linkQuery(s, italy))), italy)).toEqual(s);
  });
});
