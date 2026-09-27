import { atTiers, getJson, num } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface Calculator {
  calculator: { transaction: { conversionRate: string; commissionAmount: number } };
}

// Paysend's corridor pages use a country slug; an unknown one silently shows a different corridor.
const SLUGS: Record<string, string> = {
  GB: "the-united-kingdom",
  IT: "italy",
  ES: "spain",
  FR: "france",
  DE: "germany",
  PT: "portugal",
  IE: "ireland",
  US: "the-united-states-of-america",
  CA: "canada",
};
const url = (country: string) =>
  `https://paysend.com/${country === "GB" ? "en-gb" : "en-us"}/send-money/from-${SLUGS[country]}-to-bangladesh`;
const ROUTES: Routes = { "GBP-BDT": { url }, "EUR-BDT": { url }, "USD-BDT": { url }, "CAD-BDT": { url } };

export const paysend: ProviderDef = {
  id: "paysend",
  name: "Paysend",
  urlFor: urlsFrom(ROUTES),
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
