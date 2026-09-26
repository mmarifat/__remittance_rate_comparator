import { getJson, num } from "./http";
import type { ProviderDef } from "./types";
import type { DeliveryMethod, Quote } from "../types";

interface RemitlyEstimate {
  exchange_rate: { base_rate: string; promotional_exchange_rate?: string; capped_promotional_exchange_rate_amount?: string };
  fee: { total_fee_amount: string };
  pay_out_method: string;
}

interface RemitlyResponse {
  estimate: RemitlyEstimate;
  pay_out_price_estimates?: { estimates: RemitlyEstimate[] };
}

const METHODS: Record<string, DeliveryMethod> = {
  BANK_DEPOSIT: "bank",
  DIRECT_TO_PHONE: "wallet",
  CASH_PICKUP: "cash",
};

// Remitly rate-limits hard (429 after a few calls a minute), so take one quote and read every
// delivery method from it. Fees are flat, so one amount is enough.
const AMOUNT = 1000;

export const remitly: ProviderDef = {
  id: "remitly",
  name: "Remitly",
  url: "https://www.remitly.com/gb/en/bangladesh",
  domain: "remitly.com",
  async fetchQuotes() {
    const res = await getJson<RemitlyResponse>(
      `https://api.remitly.io/v3/calculator/estimate?conduit=GBR%3AGBP-BGD%3ABDT&anchor=SEND&amount=${AMOUNT}&purpose=OTHER&customer_segment=UNRECOGNIZED&strict_promo=false`,
    );
    const estimates = [res.estimate, ...(res.pay_out_price_estimates?.estimates ?? [])];
    const quotes = new Map<DeliveryMethod, Quote>();
    for (const e of estimates) {
      const method = METHODS[e.pay_out_method];
      if (!method || quotes.has(method)) continue;
      quotes.set(method, {
        sendAmount: AMOUNT,
        rate: num(e.exchange_rate.base_rate),
        fee: num(e.fee.total_fee_amount),
        method,
      });
    }

    const promo = res.estimate.exchange_rate;
    const note =
      promo.promotional_exchange_rate && promo.capped_promotional_exchange_rate_amount
        ? `New customers: ${num(promo.promotional_exchange_rate).toFixed(2)} on the first £${num(promo.capped_promotional_exchange_rate_amount)}`
        : undefined;

    return { quotes: [...quotes.values()], note };
  },
};
