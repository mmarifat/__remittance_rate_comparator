import { formatMoney } from "../format";
import { getJson, num } from "./http";
import { routeFor, urlsOf, type Routes } from "./routes";
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

/** `conduit` is Remitly's route code: sending country:currency - receiving country:currency. */
const ROUTES: Routes<{ conduit: string }> = {
  "GBP-BDT": { url: "https://www.remitly.com/gb/en/bangladesh", conduit: "GBR:GBP-BGD:BDT" },
  "EUR-BDT": { url: "https://www.remitly.com/it/en/bangladesh", conduit: "ITA:EUR-BGD:BDT" },
  "USD-BDT": { url: "https://www.remitly.com/us/en/bangladesh", conduit: "USA:USD-BGD:BDT" },
  "CAD-BDT": { url: "https://www.remitly.com/ca/en/bangladesh", conduit: "CAN:CAD-BGD:BDT" },
};

export const remitly: ProviderDef = {
  id: "remitly",
  name: "Remitly",
  urls: urlsOf(ROUTES),
  domain: "remitly.com",
  async fetchQuotes(corridor) {
    const { conduit } = routeFor(ROUTES, corridor);
    const res = await getJson<RemitlyResponse>(
      `https://api.remitly.io/v3/calculator/estimate?conduit=${encodeURIComponent(conduit)}&anchor=SEND&amount=${AMOUNT}&purpose=OTHER&customer_segment=UNRECOGNIZED&strict_promo=false`,
    );
    const estimates = [res.estimate, ...(res.pay_out_price_estimates?.estimates ?? [])];
    const quotes = new Map<DeliveryMethod, Quote>();
    for (const e of estimates) {
      // Some routes (Canada) return a single quote without a payout method; it's the bank deposit price.
      const method = e.pay_out_method ? METHODS[e.pay_out_method] : "bank";
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
        ? `New customers: ${num(promo.promotional_exchange_rate).toFixed(2)} on the first ${formatMoney(num(promo.capped_promotional_exchange_rate_amount), corridor.from)}`
        : undefined;

    return { quotes: [...quotes.values()], note };
  },
};
