import { atTiers, getJson, num } from "./http";
import type { ProviderDef } from "./types";

interface FeeQuote {
  feeQuotesByCurrency: {
    BDT?: { fxRate: number; sendFee: number; promo?: { fxRate: number; sendFee: number } };
  };
}

export const moneygram: ProviderDef = {
  id: "moneygram",
  name: "MoneyGram",
  url: "https://www.moneygram.com/gb/en/corridor/bangladesh",
  domain: "moneygram.com",
  async fetchQuotes() {
    let promo: { fxRate: number; sendFee: number } | undefined;
    const quotes = await atTiers(async (amount) => {
      // Without these language headers their bot protection answers 403.
      const res = await getJson<FeeQuote>(
        `https://www.moneygram.com/api/send-money/fee-quote/v2?senderCountryCode=GBR&senderCurrencyCode=GBP&receiverCountryCode=BGD&receiverCurrencyCode=BDT&sendAmount=${amount.toFixed(2)}`,
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
