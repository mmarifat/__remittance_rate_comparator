import { atTiers, getJson, num } from "./http";
import type { ProviderDef } from "./types";

interface Calculator {
  calculator: { transaction: { conversionRate: string; commissionAmount: number } };
}

export const paysend: ProviderDef = {
  id: "paysend",
  name: "Paysend",
  url: "https://paysend.com/en-gb/send-money/from-the-united-kingdom-to-bangladesh",
  domain: "paysend.com",
  fetchQuotes: () =>
    atTiers(async (amount) => {
      const res = await getJson<Calculator>(
        `https://paysend.com/api/calculator?lang=en&country=gb&operation=send&amount=${amount}&sourceCountry=gb&targetCountry=bd&sourceCurrency=gbp&targetCurrency=bdt`,
      );
      const t = res.calculator.transaction;
      return { sendAmount: amount, rate: num(t.conversionRate), fee: num(t.commissionAmount), method: "bank" };
    }, [100, 1000]),
};
