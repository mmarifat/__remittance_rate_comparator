import { destinationOf, type Corridor } from "../corridors";
import { atTiers, getJson, num } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface SendwavePrice {
  /** Regular price. */
  baseExchangeRate: string;
  baseFeeAmount: string;
  /** Price after campaigns, such as the "Intro Rate Discount" new customers get. */
  effectiveExchangeRate: string;
  effectiveFeeAmount: string;
  campaignsApplied: unknown[];
}

// Sendwave has no country landing pages; its currency page shows the rate and links to the app.
const url = (_country: string, corridor: Corridor) =>
  `https://www.sendwave.com/en/currency-converter/currencies/${corridor.to.toLowerCase()}_${destinationOf(corridor).country.toLowerCase()}`;
const ROUTES: Routes = {
  "GBP-BDT": { url }, "EUR-BDT": { url }, "USD-BDT": { url }, "CAD-BDT": { url },
  "GBP-PKR": { url }, "EUR-PKR": { url }, "USD-PKR": { url }, "CAD-PKR": { url },
};

export const sendwave: ProviderDef = {
  id: "sendwave",
  name: "Sendwave",
  urlFor: urlsFrom(ROUTES),
  domain: "sendwave.com",
  fetchQuotes: (corridor) => {
    routeFor(ROUTES, corridor);
    return atTiers(async (amount) => {
      const p = await getJson<SendwavePrice>(
        `https://app.sendwave.com/v2/pricing-public?amountType=SEND&receiveCurrency=${corridor.to}&amount=${amount}&sendCurrency=${corridor.from}&sendCountryIso2=${corridor.sendCountry.toLowerCase()}&receiveCountryIso2=${destinationOf(corridor).country.toLowerCase()}`,
      );
      const rate = num(p.baseExchangeRate);
      const fee = num(p.baseFeeAmount);
      // The headline price includes any new-customer campaign; the base price is what everyone pays.
      const promoRate = num(p.effectiveExchangeRate);
      const promoFee = num(p.effectiveFeeAmount);
      const promo = promoRate > rate || promoFee < fee ? { rate: promoRate, fee: promoFee } : undefined;
      // Wallet and bank payouts are priced the same.
      return (["bank", "wallet"] as const).map((method) => ({ sendAmount: amount, rate, fee, method, promo }));
    });
  },
};
