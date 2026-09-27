import { atTiers, getJson, num } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface WisePrice {
  payInMethod: string;
  payOutMethod: string;
  midRate: number;
  total: number;
}

const ROUTES: Routes = {
  "GBP-BDT": { url: "https://wise.com/gb/currency-converter/gbp-to-bdt-rate" },
  "EUR-BDT": { url: "https://wise.com/gb/currency-converter/eur-to-bdt-rate" },
  "USD-BDT": { url: "https://wise.com/us/currency-converter/usd-to-bdt-rate" },
  "CAD-BDT": { url: "https://wise.com/ca/currency-converter/cad-to-bdt-rate" },
};

export const wise: ProviderDef = {
  id: "wise",
  name: "Wise",
  urlFor: urlsFrom(ROUTES),
  domain: "wise.com",
  fetchQuotes: (corridor) => {
    routeFor(ROUTES, corridor);
    return atTiers(async (amount) => {
      const prices = await getJson<WisePrice[]>(
        `https://wise.com/gateway/v1/price?sourceAmount=${amount}&sourceCurrency=${corridor.from}&targetCurrency=${corridor.to}`,
      );
      const bank = prices.find((p) => p.payInMethod === "BANK_TRANSFER" && p.payOutMethod === "BANK_TRANSFER");
      if (!bank) throw new Error("No bank-to-bank price");
      return { sendAmount: amount, rate: num(bank.midRate), fee: num(bank.total), method: "bank" };
    });
  },
};
