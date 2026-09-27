import { atTiers, getJson, num } from "./http";
import { routeFor, urlsOf, type Routes } from "./routes";
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

const ROUTES: Routes = {
  "GBP-BDT": { url: "https://www.instarem.com/en-gb/send-money-to-bangladesh/" },
  "EUR-BDT": { url: "https://www.instarem.com/" },
  "USD-BDT": { url: "https://www.instarem.com/" },
  "CAD-BDT": { url: "https://www.instarem.com/" },
};

export const instarem: ProviderDef = {
  id: "instarem",
  name: "Instarem",
  urls: urlsOf(ROUTES),
  domain: "instarem.com",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
    const route = `source_currency=${corridor.from}&destination_currency=${corridor.to}&country_code=${corridor.sendCountry}`;
    // The quote needs the id of the pay-in method; look up "Bank Transfer" rather than hardcoding it.
    const payIns = await getJson<PayInMethods>(`${BASE}/payment-method/fee?${route}&source_amount=1000`);
    const bankId = payIns.data.find((m) => /bank/i.test(m.value))?.key ?? payIns.data[0]?.key;
    if (bankId === undefined) throw new Error("No pay-in method");

    let promoRate = 0;
    const quotes = await atTiers(async (amount) => {
      const { data } = await getJson<Computed>(
        `${BASE}/transaction/computed-value?${route}&instarem_bank_account_id=${bankId}&source_amount=${amount}`,
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
