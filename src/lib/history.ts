import { pickQuote } from "./compare";
import type { DeliveryMethod, RatesSnapshot } from "./types";

/** One hourly check of every provider, as stored in history.json on the `data` branch. */
export interface HistoryRecord {
  /** When providers were queried (ISO). */
  t: string;
  /** Mid-market rate. */
  mid: number | null;
  /** Provider id → headline rate, or null when the provider didn't answer. */
  r: Record<string, number | null>;
}

export interface History {
  records: HistoryRecord[];
}

export interface TrendPoint {
  t: number;
  rate: number;
}

const HEADLINE_AMOUNT = 1000;
const METHOD_PREFERENCE: DeliveryMethod[] = ["bank", "wallet", "cash"];

/**
 * A provider's headline rate: sending £1,000, to a bank account where it offers one.
 * WorldRemit and TransferGo only pay out to wallets, so they fall back to that.
 */
export function headlineRate(provider: RatesSnapshot["providers"][number]): number | null {
  if (provider.status !== "ok") return null;
  for (const method of METHOD_PREFERENCE) {
    const quote = pickQuote(provider.quotes, HEADLINE_AMOUNT, method);
    if (quote) return Math.round(quote.rate * 10_000) / 10_000;
  }
  return null;
}

export function toRecord(snapshot: RatesSnapshot): HistoryRecord {
  return {
    t: snapshot.updatedAt,
    mid: snapshot.midMarket,
    r: Object.fromEntries(snapshot.providers.map((p) => [p.id, headlineRate(p)])),
  };
}

/** Adds a record (skipping a repeat of the same snapshot) and keeps only the last `keepDays`. */
export function appendRecord(records: HistoryRecord[], record: HistoryRecord, keepDays = 30): HistoryRecord[] {
  if (records.at(-1)?.t === record.t) return records;
  const cutoff = Date.parse(record.t) - keepDays * 86_400_000;
  return [...records, record].filter((r) => Date.parse(r.t) >= cutoff);
}

/** One record per line, so each hourly commit's diff is a single added line. */
export function serializeHistory(history: History): string {
  return `{"records":[\n${history.records.map((r) => JSON.stringify(r)).join(",\n")}\n]}\n`;
}

/**
 * Which providers need attention: `down` failed in each of the last `downAfter` checks,
 * `up` answered in the latest one.
 */
export function providerHealth(
  records: HistoryRecord[],
  ids: string[],
  downAfter = 6,
): { down: string[]; up: string[] } {
  const recent = records.slice(-downAfter);
  const latest = records.at(-1);
  return {
    down: recent.length < downAfter ? [] : ids.filter((id) => recent.every((r) => r.r[id] == null)),
    up: latest ? ids.filter((id) => latest.r[id] != null) : [],
  };
}

/** A provider's rates within the last `days`, oldest first, skipping checks it didn't answer. */
export function providerTrend(records: HistoryRecord[], id: string, now: number, days = 7): TrendPoint[] {
  const since = now - days * 86_400_000;
  return records.flatMap((r) => {
    const t = Date.parse(r.t);
    const rate = r.r[id];
    return t >= since && rate != null ? [{ t, rate }] : [];
  });
}

/** The best headline rate across all providers at each check within the last `days`. */
export function bestRateTrend(records: HistoryRecord[], now: number, days = 7): TrendPoint[] {
  const since = now - days * 86_400_000;
  return records.flatMap((r) => {
    const t = Date.parse(r.t);
    const rates = Object.values(r.r).filter((v): v is number => v != null);
    return t >= since && rates.length ? [{ t, rate: Math.max(...rates) }] : [];
  });
}
