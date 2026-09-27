import { atTiers, getJson, num, postJson } from "./http";
import { routeFor, urlsOf, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface Methods {
  body: { methodId: string; sender: { account: string }; recipient: { account: string }; isAvailable: boolean }[];
}

interface Calculation {
  body: { currencyRate: { rate: number }; feeSum: { amount: number; type?: string } };
}

/** Profee wants ISO 3166 numeric country codes and a lowercase corridor slug. It doesn't serve US senders. */
const ROUTES: Routes<{ slug: string; country: number }> = {
  "GBP-BDT": { url: "https://www.profee.com/send-money/from-united-kingdom-to-bangladesh", slug: "gb-bd", country: 826 },
  "EUR-BDT": { url: "https://www.profee.com/", slug: "it-bd", country: 380 },
  "CAD-BDT": { url: "https://www.profee.com/", slug: "ca-bd", country: 124 },
};

export const profee: ProviderDef = {
  id: "profee",
  name: "Profee",
  urls: urlsOf(ROUTES),
  domain: "profee.com",
  async fetchQuotes(corridor) {
    const { slug, country } = routeFor(ROUTES, corridor);
    const methods = await getJson<Methods>(`https://www.profee.com/api/corridors/${slug}/methods`);
    const bank = methods.body.find((m) => m.isAvailable && m.recipient.account === "WBANK");
    if (!bank) throw new Error("No bank payout method");

    let promoFee = false;
    const quotes = await atTiers(async (amount) => {
      const res = await postJson<Calculation>("https://terminal.profee.com/api/v2/transfer/terminal/calculation", {
        methodId: bank.methodId,
        from: { currency: corridor.from, amount, country },
        to: { currency: corridor.to, amount: null, country: 50 },
        skipLimitValidation: false,
      });
      promoFee ||= res.body.feeSum.type === "PROMO";
      return { sendAmount: amount, rate: num(res.body.currencyRate.rate), fee: num(res.body.feeSum.amount), method: "bank" };
    }, [100, 1000]);
    return { quotes, note: promoFee ? "Fee waived as a first-transfer promo" : undefined };
  },
};
