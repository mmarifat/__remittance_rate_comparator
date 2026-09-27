import { COUNTRIES } from "../corridors";
import { formatMoney } from "../format";
import { getJson, num } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";
import type { DeliveryMethod, Quote } from "../types";

interface RemitlyEstimate {
  exchange_rate: { base_rate: string; promotional_exchange_rate?: string; capped_promotional_exchange_rate_amount?: string };
  fee: { total_fee_amount: string };
  discount?: { fee_discount_amount?: string };
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

const url = (country: string) => `https://www.remitly.com/${country.toLowerCase()}/en/bangladesh`;
const ROUTES: Routes = { "GBP-BDT": { url }, "EUR-BDT": { url }, "USD-BDT": { url }, "CAD-BDT": { url } };

export const remitly: ProviderDef = {
  id: "remitly",
  name: "Remitly",
  urlFor: urlsFrom(ROUTES),
  domain: "remitly.com",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
    // Remitly's route code: sending country:currency - receiving country:currency, e.g. ESP:EUR-BGD:BDT.
    const conduit = `${COUNTRIES[corridor.sendCountry].iso3}:${corridor.from}-BGD:${corridor.to}`;
    const res = await getJson<RemitlyResponse>(
      `https://api.remitly.io/v3/calculator/estimate?conduit=${encodeURIComponent(conduit)}&anchor=SEND&amount=${AMOUNT}&purpose=OTHER&customer_segment=UNRECOGNIZED&strict_promo=false`,
    );
    const estimates = [res.estimate, ...(res.pay_out_price_estimates?.estimates ?? [])];
    const quotes = new Map<DeliveryMethod, Quote>();
    for (const e of estimates) {
      // Some routes (Canada) return a single quote without a payout method; it's the bank deposit price.
      const method = e.pay_out_method ? METHODS[e.pay_out_method] : "bank";
      if (!method || quotes.has(method)) continue;
      const fee = num(e.fee.total_fee_amount);
      const { promotional_exchange_rate: promoRate, capped_promotional_exchange_rate_amount: cap } = e.exchange_rate;
      const discount = e.discount?.fee_discount_amount ? num(e.discount.fee_discount_amount) : 0;
      quotes.set(method, {
        sendAmount: AMOUNT,
        rate: num(e.exchange_rate.base_rate),
        fee,
        method,
        // New customers: a better rate on the first `cap` sent, and the fee discounted (usually to zero).
        promo:
          promoRate || discount
            ? {
                rate: promoRate ? num(promoRate) : undefined,
                upTo: cap ? num(cap) : undefined,
                fee: Math.max(0, fee - discount),
              }
            : undefined,
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
