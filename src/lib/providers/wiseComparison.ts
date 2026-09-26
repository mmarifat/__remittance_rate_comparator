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

const recent = new Map<number, { at: number; promise: Promise<Comparison> }>();

// Several providers read the same response, so share one request per amount per snapshot.
function comparison(amount: number): Promise<Comparison> {
  const hit = recent.get(amount);
  if (hit && Date.now() - hit.at < 60_000) return hit.promise;
  const promise = getJson<Comparison>(
    `https://wise.com/gateway/v3/comparisons?sourceCurrency=GBP&targetCurrency=BDT&sendAmount=${amount}`,
  );
  recent.set(amount, { at: Date.now(), promise });
  promise.catch(() => recent.delete(amount));
  return promise;
}

function comparisonQuotes(alias: string) {
  return atTiers(async (amount) => {
    const quote = (await comparison(amount)).providers.find((p) => p.alias === alias)?.quotes[0];
    if (!quote) throw new Error("Not in Wise's comparison data");
    return { sendAmount: amount, rate: num(quote.rate), fee: num(quote.fee), method: "bank" as const };
  });
}

export function viaWiseComparison(def: Omit<ProviderDef, "fetchQuotes"> & { alias: string }): ProviderDef {
  const { alias, ...rest } = def;
  return { note: NOTE, ...rest, fetchQuotes: () => comparisonQuotes(alias) };
}

/** Try the provider's own calculator first; if it fails, use Wise's copy of its bank-transfer price. */
export function withWiseFallback(def: ProviderDef, alias: string): ProviderDef {
  return {
    ...def,
    async fetchQuotes() {
      try {
        return await def.fetchQuotes();
      } catch (err) {
        try {
          return { quotes: await comparisonQuotes(alias), note: NOTE };
        } catch {
          throw err;
        }
      }
    },
  };
}
