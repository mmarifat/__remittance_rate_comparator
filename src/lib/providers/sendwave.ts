import { atTiers, getJson, num } from "./http";
import { routeFor, urlsOf, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface SendwavePrice {
  effectiveExchangeRate: string;
  effectiveFeeAmount: string;
  campaignsApplied: unknown[];
}

const ROUTES: Routes = {
  "GBP-BDT": { url: "https://www.sendwave.com/en-gb/send-money-to-bangladesh" },
  "EUR-BDT": { url: "https://www.sendwave.com/" },
  "USD-BDT": { url: "https://www.sendwave.com/" },
  "CAD-BDT": { url: "https://www.sendwave.com/" },
};

export const sendwave: ProviderDef = {
  id: "sendwave",
  name: "Sendwave",
  urls: urlsOf(ROUTES),
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
