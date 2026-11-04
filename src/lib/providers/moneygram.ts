import { COUNTRIES, destinationOf, type Corridor, type CountryCode } from "../corridors";
import { atTiers, getJson, num } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface FeeQuote {
  feeQuotesByCurrency: Record<string, { fxRate: number; sendFee: number; promo?: { fxRate: number; sendFee: number } } | undefined>;
}

const url = (country: CountryCode, corridor: Corridor) =>
  `https://www.moneygram.com/${country.toLowerCase()}/en/corridor/${destinationOf(corridor).slug}`;
// To Pakistan only from the UK: MoneyGram's own calculator blocks datacenter requests, and Wise's
// comparison (the fallback) only carries MoneyGram's GBP→PKR price.
const ROUTES: Routes = {
  "GBP-BDT": { url }, "EUR-BDT": { url }, "USD-BDT": { url }, "CAD-BDT": { url },
  "GBP-PKR": { url },
};

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
        `https://www.moneygram.com/api/send-money/fee-quote/v2?senderCountryCode=${country}&senderCurrencyCode=${corridor.from}&receiverCountryCode=${destinationOf(corridor).iso3}&receiverCurrencyCode=${corridor.to}&sendAmount=${amount.toFixed(2)}`,
        { headers: { "Accept-Language": "en-gb", "locale-header": "en-gb" } },
      );
      const quote = res.feeQuotesByCurrency[corridor.to];
      if (!quote) throw new Error(`No ${corridor.to} quote`);
      promo ??= quote.promo;
      return {
        sendAmount: amount,
        rate: num(quote.fxRate),
        fee: num(quote.sendFee),
        method: "bank",
        promo: quote.promo ? { rate: num(quote.promo.fxRate), fee: num(quote.promo.sendFee) } : undefined,
      };
    }, [100, 1000]);
    const note = promo
      ? `First transfer: ${num(promo.fxRate).toFixed(2)}${promo.sendFee === 0 ? ", no fee" : ""}`
      : undefined;
    return { quotes, note };
  },
};
