import { atTiers, getJson, num } from "./http";
import { routeFor, urlsOf, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface Calculator {
  calculator: { transaction: { conversionRate: string; commissionAmount: number } };
}

const ROUTES: Routes = {
  "GBP-BDT": { url: "https://paysend.com/en-gb/send-money/from-the-united-kingdom-to-bangladesh" },
  "EUR-BDT": { url: "https://paysend.com/" },
  "USD-BDT": { url: "https://paysend.com/" },
  "CAD-BDT": { url: "https://paysend.com/" },
};

export const paysend: ProviderDef = {
  id: "paysend",
  name: "Paysend",
  urls: urlsOf(ROUTES),
  domain: "paysend.com",
  fetchQuotes: (corridor) => {
    routeFor(ROUTES, corridor);
    const country = corridor.sendCountry.toLowerCase();
    const currency = corridor.from.toLowerCase();
    return atTiers(async (amount) => {
      const res = await getJson<Calculator>(
        `https://paysend.com/api/calculator?lang=en&country=${country}&operation=send&amount=${amount}&sourceCountry=${country}&targetCountry=bd&sourceCurrency=${currency}&targetCurrency=bdt`,
      );
      const t = res.calculator.transaction;
      return { sendAmount: amount, rate: num(t.conversionRate), fee: num(t.commissionAmount), method: "bank" };
    }, [100, 1000]);
  },
};
