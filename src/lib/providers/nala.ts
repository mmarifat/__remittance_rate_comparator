import { getJson, num } from "./http";
import type { ProviderDef } from "./types";

interface FeedRow {
  source_currency: string;
  destination_currency: string;
  rate: string;
  provider_name: string;
}

// The rate feed behind NALA's calculator widget. It carries NALA's own rate and a few competitors'.
async function feedRate(providerName: string): Promise<number> {
  const res = await getJson<{ data: FeedRow[] }>("https://partners-api.prod.nala-api.com/v1/fx/rates");
  const row = res.data.find(
    (r) => r.provider_name === providerName && r.source_currency === "GBP" && r.destination_currency === "BDT",
  );
  if (!row) throw new Error(`No GBP→BDT rate for ${providerName} in NALA's feed`);
  return num(row.rate);
}

export const nala: ProviderDef = {
  id: "nala",
  name: "NALA",
  url: "https://www.nala.com/country/bangladesh",
  domain: "nala.com",
  async fetchQuotes() {
    const rate = await feedRate("NALA");
    // NALA charges no fee to Bangladesh and pays banks, bKash and Nagad at the same rate.
    return (["bank", "wallet"] as const).map((method) => ({ sendAmount: 1, rate, fee: 0, method }));
  },
};

/** Use NALA's copy of a competitor's rate when that competitor's own calculator fails. */
export function withNalaFallback(def: ProviderDef, providerName: string, fee: number): ProviderDef {
  return {
    ...def,
    async fetchQuotes() {
      try {
        return await def.fetchQuotes();
      } catch (err) {
        try {
          const rate = await feedRate(providerName);
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
