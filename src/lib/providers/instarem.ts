import { atTiers, getJson, num } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
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

// Instarem has a local Bangladesh page for some countries; the rest share its international one.
const LOCAL_PAGES = new Set(["GB", "US", "CA", "DE", "FR", "IE"]);
const url = (country: string) =>
  `https://www.instarem.com/${LOCAL_PAGES.has(country) ? `en-${country.toLowerCase()}` : "en"}/send-money-to-bangladesh/`;
const ROUTES: Routes = { "GBP-BDT": { url }, "EUR-BDT": { url }, "USD-BDT": { url }, "CAD-BDT": { url } };

export const instarem: ProviderDef = {
  id: "instarem",
  name: "Instarem",
  urlFor: urlsFrom(ROUTES),
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
      // The headline price is a first-transfer promo; the regular_* fields are what returning customers pay.
      const otherFees = data.payment_method_fee_amount + data.payout_method_fee_amount;
      const regularRate = num(data.regular_instarem_fx_rate ?? data.instarem_fx_rate);
      const firstRate = num(data.instarem_fx_rate);
      return {
        sendAmount: amount,
        rate: regularRate,
        fee: num((data.regular_transaction_fee_amount ?? data.transaction_fee_amount) + otherFees),
        method: "bank",
        promo: firstRate > regularRate ? { rate: firstRate, fee: num(data.transaction_fee_amount + otherFees) } : undefined,
      };
    });

    const regular = Math.max(...quotes.map((q) => q.rate));
    const note = promoRate > regular ? `First transfer: ${promoRate.toFixed(2)}` : undefined;
    return { quotes, note };
  },
};
