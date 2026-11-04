import { destinationOf, type Corridor } from "../corridors";
import type { DeliveryMethod, Quote } from "../types";
import { atTiers, getJson, num } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface Charges {
  data: {
    charges: {
      /** Rate applied, which can be a "special rate" above the standard `base_rate`. */
      rate: number;
      base_rate: number;
      /** Fee in the sending currency. */
      total_charges: number;
    };
  };
}

// The calculator's payout types; it asks for each one separately.
const PAYOUTS: [string, DeliveryMethod][] = [
  ["Account", "bank"],
  ["Mobile Transfer", "wallet"],
  ["Cash Collection", "cash"],
];

// Dahabshiil's US arm doesn't serve Bangladesh or Pakistan; the UK, EU and Canadian arms do.
const url = (_country: string, corridor: Corridor) => `https://www.dahabshiil.com/send-money-to-${destinationOf(corridor).slug}/`;
const EURO = ["IT", "ES", "FR", "DE", "PT", "IE"] as const;
const ROUTES: Routes = {
  "GBP-BDT": { url },
  "EUR-BDT": { url, countries: EURO },
  "CAD-BDT": { url },
  "GBP-PKR": { url },
  "EUR-PKR": { url, countries: EURO },
  "CAD-PKR": { url },
};

export const dahabshiil: ProviderDef = {
  id: "dahabshiil",
  name: "Dahabshiil",
  urlFor: urlsFrom(ROUTES),
  domain: "dahabshiil.com",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
    const { country } = destinationOf(corridor);
    const quotes: Quote[] = [];
    let special: { rate: number; base: number } | undefined;
    for (const [type, method] of PAYOUTS) {
      try {
        // Fees step up with the amount (£1.99 at £100, £15 at £1,000 to Pakistan), so bank payouts get
        // every tier; the others get two, which keeps a check to 8 requests.
        quotes.push(
          ...(await atTiers(async (amount) => {
            const { data } = await getJson<Charges>(
              `https://apigw.dahabshiil.com/remit/transaction/get-charges-anonymous?source_country_code=${corridor.sendCountry}&destination_country_iso2=${country}&amount_type=SOURCE&amount=${amount}&destination_currency=${corridor.to}&type=${encodeURIComponent(type)}`,
            );
            const { rate: applied, base_rate: base, total_charges: fee } = data.charges;
            // Ranked on the standard rate: the site marks the higher one as special, without saying who gets it.
            const rate = num(base);
            const promo = num(applied) > rate ? { rate: num(applied) } : undefined;
            if (promo && method === "bank") special ??= { rate: promo.rate, base: rate };
            return { sendAmount: amount, rate, fee: num(fee), method, promo };
          }, method === "bank" ? undefined : [100, 1000])),
        );
      } catch (err) {
        // Some destinations don't offer every payout; only a failing bank quote fails the provider.
        if (method === "bank") throw err;
      }
    }
    const note = special
      ? `Special rate ${special.rate.toFixed(2)} (standard ${special.base.toFixed(2)}); may not apply to every transfer`
      : undefined;
    return { quotes, note };
  },
};
