import { atTiers, getJson, num } from "./http";
import type { ProviderDef } from "./types";

const BASE = "https://www.instarem.com/api/v1/public";

interface PayInMethods {
  data: { key: number; value: string }[];
}

interface Computed {
  data: {
    instarem_fx_rate: number;
    regular_instarem_fx_rate?: number;
    regular_transaction_fee_amount?: number;
    transaction_fee_amount: number;
    payment_method_fee_amount: number;
    payout_method_fee_amount: number;
  };
}

export const instarem: ProviderDef = {
  id: "instarem",
  name: "Instarem",
  url: "https://www.instarem.com/en-gb/send-money-to-bangladesh/",
  domain: "instarem.com",
  async fetchQuotes() {
    // The quote needs the id of the pay-in method; look up "Bank Transfer" rather than hardcoding it.
    const payIns = await getJson<PayInMethods>(
      `${BASE}/payment-method/fee?source_currency=GBP&source_amount=1000&destination_currency=BDT&country_code=GB`,
    );
    const bankId = payIns.data.find((m) => /bank/i.test(m.value))?.key ?? payIns.data[0]?.key;
    if (bankId === undefined) throw new Error("No pay-in method");

    let promoRate = 0;
    const quotes = await atTiers(async (amount) => {
      const { data } = await getJson<Computed>(
        `${BASE}/transaction/computed-value?source_currency=GBP&destination_currency=BDT&instarem_bank_account_id=${bankId}&country_code=GB&source_amount=${amount}`,
      );
      promoRate = Math.max(promoRate, num(data.instarem_fx_rate));
      // Prefer the regular (returning-customer) price; the headline one is a first-transfer promo.
      const fee =
        (data.regular_transaction_fee_amount ?? data.transaction_fee_amount) +
        data.payment_method_fee_amount +
        data.payout_method_fee_amount;
      return {
        sendAmount: amount,
        rate: num(data.regular_instarem_fx_rate ?? data.instarem_fx_rate),
        fee: num(fee),
        method: "bank",
      };
    });

    const regular = Math.max(...quotes.map((q) => q.rate));
    const note = promoRate > regular ? `First transfer: ${promoRate.toFixed(2)}` : undefined;
    return { quotes, note };
  },
};
