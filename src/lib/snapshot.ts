import { getJson, num } from "./providers/http";
import { providers } from "./providers";
import type { ProviderDef } from "./providers/types";
import type { ProviderResult, Quote, RatesSnapshot } from "./types";

async function fetchMidMarket(): Promise<number | null> {
  try {
    const wise = await getJson<{ value: number }>("https://wise.com/rates/live?source=GBP&target=BDT");
    return num(wise.value);
  } catch {
    try {
      const er = await getJson<{ rates: Record<string, number> }>("https://open.er-api.com/v6/latest/GBP");
      return num(er.rates.BDT);
    } catch {
      return null;
    }
  }
}

/** Guards against a provider changing its response shape and us reading the wrong field. */
function isPlausible(quote: Quote, midMarket: number | null): boolean {
  if (!(quote.rate > 0) || !(quote.fee >= 0)) return false;
  if (midMarket) return Math.abs(quote.rate / midMarket - 1) < 0.1;
  return quote.rate > 100 && quote.rate < 300;
}

/** Upper bound for one provider, including all its tier requests, so a slow site can't hold up the snapshot. */
const PROVIDER_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`No answer within ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function runProvider(def: ProviderDef, midMarket: number | null): Promise<ProviderResult> {
  const base = { id: def.id, name: def.name, url: def.url, domain: def.domain };
  try {
    const fetched = await withTimeout(def.fetchQuotes(), PROVIDER_TIMEOUT_MS);
    const { quotes: all, note } = Array.isArray(fetched)
      ? { quotes: fetched, note: def.note }
      : { quotes: fetched.quotes, note: fetched.note ?? def.note };
    const quotes = all.filter((q) => isPlausible(q, midMarket));
    if (quotes.length === 0) {
      throw new Error(all.length ? "Returned a rate that doesn't look like GBP→BDT" : "No GBP→BDT quote returned");
    }
    return { ...base, note, status: "ok", quotes };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[rates] ${def.id}: ${message}`);
    return { ...base, status: "error", quotes: [], error: message };
  }
}

export async function fetchSnapshot(): Promise<RatesSnapshot> {
  const midMarket = await fetchMidMarket();
  const results = await Promise.all(providers.map((p) => runProvider(p, midMarket)));
  return { updatedAt: new Date().toISOString(), midMarket, providers: results };
}
