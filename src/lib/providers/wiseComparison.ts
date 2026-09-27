import type { Corridor } from "../corridors";
import { atTiers, getJson, num } from "./http";
import type { ProviderDef } from "./types";

// Wise publishes the quotes it collects from competitors. We use it for services whose own
// calculators block automated requests, and as a backup when a direct check fails.

interface Comparison {
  providers: {
    alias: string;
    quotes: { rate: number; fee: number }[];
  }[];
}

const NOTE = "Price via Wise's comparison, up to 1 hr old";

const recent = new Map<string, { at: number; promise: Promise<Comparison> }>();

// Several providers read the same response, so share one request per currency and amount per snapshot.
function comparison(corridor: Corridor, amount: number): Promise<Comparison> {
  const key = `${corridor.id}-${corridor.sendCountry}-${amount}`;
  const hit = recent.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.promise;
  const promise = getJson<Comparison>(
    // sourceCountry matters for euros: the providers and prices listed differ by eurozone country.
    `https://wise.com/gateway/v3/comparisons?sourceCurrency=${corridor.from}&targetCurrency=${corridor.to}&sourceCountry=${corridor.sendCountry}&sendAmount=${amount}`,
  );
  recent.set(key, { at: Date.now(), promise });
  promise.catch(() => recent.delete(key));
  return promise;
}

function comparisonQuotes(corridor: Corridor, alias: string) {
  return atTiers(async (amount) => {
    const quote = (await comparison(corridor, amount)).providers.find((p) => p.alias === alias)?.quotes[0];
    if (!quote) throw new Error("Not in Wise's comparison data");
    return { sendAmount: amount, rate: num(quote.rate), fee: num(quote.fee), method: "bank" as const };
  });
}

export function viaWiseComparison(def: Omit<ProviderDef, "fetchQuotes"> & { alias: string }): ProviderDef {
  const { alias, ...rest } = def;
  return { note: NOTE, ...rest, fetchQuotes: (corridor) => comparisonQuotes(corridor, alias) };
}

/** Try the provider's own calculator first; if it fails, use Wise's copy of its bank-transfer price. */
export function withWiseFallback(def: ProviderDef, alias: string): ProviderDef {
  return {
    ...def,
    async fetchQuotes(corridor) {
      try {
        return await def.fetchQuotes(corridor);
      } catch (err) {
        try {
          return { quotes: await comparisonQuotes(corridor, alias), note: NOTE };
        } catch {
          throw err;
        }
      }
    },
  };
}
