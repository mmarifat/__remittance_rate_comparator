import { describe, expect, it } from "vitest";
import { formatAgo, formatBdt, formatGbp } from "./format";

describe("format", () => {
  it("groups taka in lakhs", () => {
    expect(formatBdt(163450.4)).toBe("৳1,63,450");
    expect(formatBdt(12345678)).toBe("৳1,23,45,678");
  });

  it("drops pence on whole pounds only", () => {
    expect(formatGbp(1000)).toBe("£1,000");
    expect(formatGbp(3.99)).toBe("£3.99");
  });

  it("describes how long ago rates were fetched", () => {
    const now = Date.parse("2026-09-26T10:00:00Z");
    expect(formatAgo("2026-09-26T09:59:40Z", now)).toBe("just now");
    expect(formatAgo("2026-09-26T09:48:00Z", now)).toBe("12 min ago");
    expect(formatAgo("2026-09-26T07:00:00Z", now)).toBe("3 hr ago");
  });
});
