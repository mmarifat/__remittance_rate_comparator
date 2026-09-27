import { atTiers, getJson, num } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface SendwavePrice {
  effectiveExchangeRate: string;
  effectiveFeeAmount: string;
  campaignsApplied: unknown[];
}

// Sendwave has no Bangladesh landing page; its taka page shows the rate and links to the app.
const url = "https://www.sendwave.com/en/currency-converter/currencies/bdt_bd";
const ROUTES: Routes = { "GBP-BDT": { url }, "EUR-BDT": { url }, "USD-BDT": { url }, "CAD-BDT": { url } };

export const sendwave: ProviderDef = {
  id: "sendwave",
  name: "Sendwave",
  urlFor: urlsFrom(ROUTES),
  domain: "sendwave.com",
  fetchQuotes: (corridor) => {
    routeFor(ROUTES, corridor);
    return atTiers(async (amount) => {
      const p = await getJson<SendwavePrice>(
        `https://app.sendwave.com/v2/pricing-public?amountType=SEND&receiveCurrency=${corridor.to}&amount=${amount}&sendCurrency=${corridor.from}&sendCountryIso2=${corridor.sendCountry.toLowerCase()}&receiveCountryIso2=bd`,
      );
      const rate = num(p.effectiveExchangeRate);
      const fee = num(p.effectiveFeeAmount);
      // bKash and bank payouts are priced the same.
      return (["bank", "wallet"] as const).map((method) => ({ sendAmount: amount, rate, fee, method }));
    });
  },
};
