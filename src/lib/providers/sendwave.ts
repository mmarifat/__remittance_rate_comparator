import { atTiers, getJson, num } from "./http";
import type { ProviderDef } from "./types";

interface SendwavePrice {
  effectiveExchangeRate: string;
  effectiveFeeAmount: string;
  campaignsApplied: unknown[];
}

export const sendwave: ProviderDef = {
  id: "sendwave",
  name: "Sendwave",
  url: "https://www.sendwave.com/en-gb/send-money-to-bangladesh",
  domain: "sendwave.com",
  fetchQuotes: () =>
    atTiers(async (amount) => {
      const p = await getJson<SendwavePrice>(
        `https://app.sendwave.com/v2/pricing-public?amountType=SEND&receiveCurrency=BDT&amount=${amount}&sendCurrency=GBP&sendCountryIso2=gb&receiveCountryIso2=bd`,
      );
      const rate = num(p.effectiveExchangeRate);
      const fee = num(p.effectiveFeeAmount);
      // bKash and bank payouts are priced the same.
      return (["bank", "wallet"] as const).map((method) => ({ sendAmount: amount, rate, fee, method }));
    }),
};
