import { COUNTRIES, type CountryCode } from "../corridors";
import { atTiers, getJson, num, postJson } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface Methods {
  body: { methodId: string; sender: { account: string }; recipient: { account: string }; isAvailable: boolean }[];
}

interface Calculation {
  body: { currencyRate: { rate: number }; feeSum: { amount: number; type?: string } };
}

// Profee doesn't serve US senders.
const url = (country: CountryCode) =>
  `https://www.profee.com/send-money/from-${COUNTRIES[country].name.toLowerCase().replace(/ /g, "-")}-to-bangladesh`;
const ROUTES: Routes = { "GBP-BDT": { url }, "EUR-BDT": { url }, "CAD-BDT": { url } };

export const profee: ProviderDef = {
  id: "profee",
  name: "Profee",
  urlFor: urlsFrom(ROUTES),
  domain: "profee.com",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
    // Profee wants a lowercase corridor slug and ISO 3166 numeric country codes.
    const slug = `${corridor.sendCountry.toLowerCase()}-bd`;
    const country = COUNTRIES[corridor.sendCountry].numeric;
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
