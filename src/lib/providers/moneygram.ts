import { COUNTRIES } from "../corridors";
import { atTiers, getJson, num } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface FeeQuote {
  feeQuotesByCurrency: {
    BDT?: { fxRate: number; sendFee: number; promo?: { fxRate: number; sendFee: number } };
  };
}

const url = (country: string) => `https://www.moneygram.com/${country.toLowerCase()}/en/corridor/bangladesh`;
const ROUTES: Routes = { "GBP-BDT": { url }, "EUR-BDT": { url }, "USD-BDT": { url }, "CAD-BDT": { url } };

export const moneygram: ProviderDef = {
  id: "moneygram",
  name: "MoneyGram",
  urlFor: urlsFrom(ROUTES),
  domain: "moneygram.com",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
    // MoneyGram uses ISO 3166 alpha-3 country codes.
    const country = COUNTRIES[corridor.sendCountry].iso3;
    let promo: { fxRate: number; sendFee: number } | undefined;
    const quotes = await atTiers(async (amount) => {
      // Without these language headers their bot protection answers 403.
      const res = await getJson<FeeQuote>(
        `https://www.moneygram.com/api/send-money/fee-quote/v2?senderCountryCode=${country}&senderCurrencyCode=${corridor.from}&receiverCountryCode=BGD&receiverCurrencyCode=${corridor.to}&sendAmount=${amount.toFixed(2)}`,
        { headers: { "Accept-Language": "en-gb", "locale-header": "en-gb" } },
      );
      const bdt = res.feeQuotesByCurrency.BDT;
      if (!bdt) throw new Error("No BDT quote");
      promo ??= bdt.promo;
      return {
        sendAmount: amount,
        rate: num(bdt.fxRate),
        fee: num(bdt.sendFee),
        method: "bank",
        promo: bdt.promo ? { rate: num(bdt.promo.fxRate), fee: num(bdt.promo.sendFee) } : undefined,
      };
    }, [100, 1000]);
    const note = promo
      ? `First transfer: ${num(promo.fxRate).toFixed(2)}${promo.sendFee === 0 ? ", no fee" : ""}`
      : undefined;
    return { quotes, note };
  },
};
