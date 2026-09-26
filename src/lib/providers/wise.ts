import { atTiers, getJson, num } from "./http";
import type { ProviderDef } from "./types";

interface WisePrice {
  payInMethod: string;
  payOutMethod: string;
  midRate: number;
  total: number;
}

export const wise: ProviderDef = {
  id: "wise",
  name: "Wise",
  url: "https://wise.com/gb/currency-converter/gbp-to-bdt-rate",
  domain: "wise.com",
  fetchQuotes: () =>
    atTiers(async (amount) => {
      const prices = await getJson<WisePrice[]>(
        `https://wise.com/gateway/v1/price?sourceAmount=${amount}&sourceCurrency=GBP&targetCurrency=BDT`,
      );
      const bank = prices.find((p) => p.payInMethod === "BANK_TRANSFER" && p.payOutMethod === "BANK_TRANSFER");
      if (!bank) throw new Error("No bank-to-bank price");
      return { sendAmount: amount, rate: num(bank.midRate), fee: num(bank.total), method: "bank" };
    }),
};
