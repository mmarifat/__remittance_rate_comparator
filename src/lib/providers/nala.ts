import type { Corridor } from "../corridors";
import { getJson, num } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface FeedRow {
  source_currency: string;
  destination_currency: string;
  rate: string;
  provider_name: string;
}

// The rate feed behind NALA's calculator widget. It carries NALA's own rate and a few competitors'.
async function feedRate(providerName: string, corridor: Corridor): Promise<number> {
  const res = await getJson<{ data: FeedRow[] }>("https://partners-api.prod.nala-api.com/v1/fx/rates");
  const row = res.data.find(
    (r) =>
      r.provider_name === providerName && r.source_currency === corridor.from && r.destination_currency === corridor.to,
  );
  if (!row) throw new Error(`No ${corridor.from}→${corridor.to} rate for ${providerName} in NALA's feed`);
  return num(row.rate);
}

// NALA's feed has GBP, USD and EUR rates to Bangladesh, but not CAD.
const URL = "https://www.nala.com/country/bangladesh";
const ROUTES: Routes = { "GBP-BDT": { url: URL }, "EUR-BDT": { url: URL }, "USD-BDT": { url: URL } };

export const nala: ProviderDef = {
  id: "nala",
  name: "NALA",
  urlFor: urlsFrom(ROUTES),
  domain: "nala.com",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
    const rate = await feedRate("NALA", corridor);
    // NALA charges no fee to Bangladesh and pays banks, bKash and Nagad at the same rate.
    return (["bank", "wallet"] as const).map((method) => ({ sendAmount: 1, rate, fee: 0, method }));
  },
};

/** Use NALA's copy of a competitor's rate when that competitor's own calculator fails. */
export function withNalaFallback(def: ProviderDef, providerName: string, fee: number): ProviderDef {
  return {
    ...def,
    async fetchQuotes(corridor) {
      try {
        return await def.fetchQuotes(corridor);
      } catch (err) {
        try {
          const rate = await feedRate(providerName, corridor);
          return {
            quotes: [{ sendAmount: 1, rate, fee, method: "wallet" as const }],
            note: "Rate via NALA's comparison feed",
          };
        } catch {
          throw err;
        }
      }
    },
  };
}
