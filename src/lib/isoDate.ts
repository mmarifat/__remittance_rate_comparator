const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

export interface IsoDate {
  date: Date;
  /** A calendar date alone (the start of that UTC day), not a moment. */
  dateOnly: boolean;
}

/**
 * Strict ISO 8601: a calendar date (`2026-11-03`, the start of that UTC day) or a date and time with
 * `Z` or an offset (`2026-11-03T10:00:00+05:00`). A time without an offset would depend on the server's
 * time zone, so it's refused, as are impossible dates (Feb 30) that `new Date` would quietly roll over.
 */
export function parseIsoDate(raw: string): IsoDate | null {
  const dateOnly = DATE.exec(raw);
  const m = dateOnly ?? DATE_TIME.exec(raw);
  if (!m) return null;
  const [year, month, day, hour = "0", minute = "0", second = "0"] = m.slice(1).map((part) => part ?? undefined);
  const calendar = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (calendar.getUTCFullYear() !== Number(year) || calendar.getUTCMonth() !== Number(month) - 1 || calendar.getUTCDate() !== Number(day)) {
    return null;
  }
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : { date, dateOnly: Boolean(dateOnly) };
}
