import { describe, expect, it } from "vitest";
import { parseIsoDate } from "./isoDate";

describe("parseIsoDate", () => {
  it("takes a calendar date as the start of that UTC day", () => {
    expect(parseIsoDate("2026-11-03")).toEqual({ date: new Date("2026-11-03T00:00:00Z"), dateOnly: true });
  });

  it("takes a date and time with Z or an offset", () => {
    expect(parseIsoDate("2026-11-03T10:30:00Z")).toEqual({ date: new Date("2026-11-03T10:30:00Z"), dateOnly: false });
    expect(parseIsoDate("2026-11-03T10:00:00+05:00")?.date.toISOString()).toBe("2026-11-03T05:00:00.000Z");
    expect(parseIsoDate("2026-11-03T10:00-03:30")?.date.toISOString()).toBe("2026-11-03T13:30:00.000Z");
  });

  it("refuses impossible dates, times without an offset, and other formats", () => {
    for (const bad of ["2026-02-30", "2026-13-01", "2026-11-03T24:00:00Z", "2026-11-03T10:00", "2026/10/31", "Nov 1 2026", "0", ""]) {
      expect(parseIsoDate(bad), bad).toBeNull();
    }
  });
});
