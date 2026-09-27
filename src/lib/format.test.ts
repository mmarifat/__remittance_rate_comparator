import { describe, expect, it } from "vitest";
import { currencySymbol, formatAgo, formatBdt, formatMoney } from "./format";

describe("format", () => {
  it("groups taka in lakhs", () => {
    expect(formatBdt(163450.4)).toBe("৳1,63,450");
    expect(formatBdt(12345678)).toBe("৳1,23,45,678");
  });

  it("formats the sending currency, dropping pence on whole amounts only", () => {
    expect(formatMoney(1000, "GBP")).toBe("£1,000");
    expect(formatMoney(3.99, "GBP")).toBe("£3.99");
    expect(formatMoney(1000, "EUR")).toBe("€1,000");
    expect(formatMoney(2.5, "USD")).toBe("US$2.50");
    expect(formatMoney(1000, "CAD")).toBe("CA$1,000");
  });

  it("gives the symbol for the amount field", () => {
    expect(["GBP", "EUR", "USD", "CAD"].map(currencySymbol)).toEqual(["£", "€", "US$", "CA$"]);
  });

  it("describes how long ago rates were fetched", () => {
    const now = Date.parse("2026-09-26T10:00:00Z");
    expect(formatAgo("2026-09-26T09:59:40Z", now)).toBe("just now");
    expect(formatAgo("2026-09-26T09:48:00Z", now)).toBe("12 min ago");
    expect(formatAgo("2026-09-26T07:00:00Z", now)).toBe("3 hr ago");
  });
});
