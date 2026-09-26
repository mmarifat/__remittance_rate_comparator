import { atTiers, getJson, num, postJson } from "./http";
import type { ProviderDef } from "./types";

interface Methods {
  body: { methodId: string; sender: { account: string }; recipient: { account: string }; isAvailable: boolean }[];
}

interface Calculation {
  body: { currencyRate: { rate: number }; feeSum: { amount: number; type?: string } };
}

export const profee: ProviderDef = {
  id: "profee",
  name: "Profee",
  url: "https://www.profee.com/send-money/from-united-kingdom-to-bangladesh",
  domain: "profee.com",
  async fetchQuotes() {
    const methods = await getJson<Methods>("https://www.profee.com/api/corridors/gb-bd/methods");
    const bank = methods.body.find((m) => m.isAvailable && m.recipient.account === "WBANK");
    if (!bank) throw new Error("No bank payout method");

    let promoFee = false;
    const quotes = await atTiers(async (amount) => {
      const res = await postJson<Calculation>("https://terminal.profee.com/api/v2/transfer/terminal/calculation", {
        methodId: bank.methodId,
        from: { currency: "GBP", amount, country: 826 },
        to: { currency: "BDT", amount: null, country: 50 },
        skipLimitValidation: false,
      });
      promoFee ||= res.body.feeSum.type === "PROMO";
      return { sendAmount: amount, rate: num(res.body.currencyRate.rate), fee: num(res.body.feeSum.amount), method: "bank" };
    }, [100, 1000]);
    return { quotes, note: promoFee ? "Fee waived as a first-transfer promo" : undefined };
  },
};
