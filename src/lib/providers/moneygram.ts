import { atTiers, getJson, num } from "./http";
import { routeFor, urlsOf, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface FeeQuote {
  feeQuotesByCurrency: {
    BDT?: { fxRate: number; sendFee: number; promo?: { fxRate: number; sendFee: number } };
  };
}

/** MoneyGram uses ISO 3166 alpha-3 country codes. */
const ROUTES: Routes<{ country: string }> = {
  "GBP-BDT": { url: "https://www.moneygram.com/gb/en/corridor/bangladesh", country: "GBR" },
  "EUR-BDT": { url: "https://www.moneygram.com/it/en/corridor/bangladesh", country: "ITA" },
  "USD-BDT": { url: "https://www.moneygram.com/us/en/corridor/bangladesh", country: "USA" },
  "CAD-BDT": { url: "https://www.moneygram.com/ca/en/corridor/bangladesh", country: "CAN" },
};

export const moneygram: ProviderDef = {
  id: "moneygram",
  name: "MoneyGram",
  urls: urlsOf(ROUTES),
  domain: "moneygram.com",
  async fetchQuotes(corridor) {
    const { country } = routeFor(ROUTES, corridor);
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
      return { sendAmount: amount, rate: num(bdt.fxRate), fee: num(bdt.sendFee), method: "bank" };
    }, [100, 1000]);
    const note = promo
      ? `First transfer: ${num(promo.fxRate).toFixed(2)}${promo.sendFee === 0 ? ", no fee" : ""}`
      : undefined;
    return { quotes, note };
  },
};
