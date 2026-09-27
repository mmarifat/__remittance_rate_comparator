import type { DeliveryMethod, ProviderResult, Quote, RatesSnapshot } from "./types";

export interface Offer {
  provider: ProviderResult;
  quote: Quote;
  /** Rate for this amount: the quote's rate, or the new-customer rate (blended if it's capped). */
  rate: number;
  /** Fee for this amount, in the sending currency. */
  fee: number;
  /** True when a new-customer deal is included in `rate` and `fee`. */
  promo: boolean;
  /** BDT the recipient gets when the sender pays `amount` in total, fees included. */
  receive: number;
  /** BDT received per unit of the sending currency paid, fees included. */
  effectiveRate: number;
}

export interface CompareOptions {
  /** Price first transfers with each provider's new-customer deal where it has one. */
  newCustomer?: boolean;
}

/**
 * Providers price in tiers, so use the quote for the largest tier the amount reaches.
 * Amounts below every tier fall back to the smallest one.
 */
export function pickQuote(quotes: Quote[], amount: number, method: DeliveryMethod): Quote | undefined {
  const candidates = quotes
    .filter((q) => q.method === method)
    .sort((a, b) => a.sendAmount - b.sendAmount);
  if (candidates.length === 0) return undefined;
  return candidates.findLast((q) => q.sendAmount <= amount) ?? candidates[0];
}

/**
 * Compare every provider for the same total spend: `amount` is what leaves the sender's pocket,
 * the fee comes out of it, and the rest is converted. Sorted best exchange rate first.
 */
export function buildOffers(
  snapshot: RatesSnapshot,
  amount: number,
  method: DeliveryMethod,
  { newCustomer = false }: CompareOptions = {},
): Offer[] {
  if (!(amount > 0)) return [];
  const offers: Offer[] = [];
  for (const provider of snapshot.providers) {
    if (provider.status !== "ok") continue;
    const quote = pickQuote(provider.quotes, amount, method);
    if (!quote) continue;
    const promo = newCustomer ? quote.promo : undefined;
    const fee = promo?.fee ?? quote.fee;
    if (fee >= amount) continue;
    const converted = amount - fee;
    // A capped deal rate covers only the first `upTo`; the rest converts at the regular rate.
    const promoRate = promo?.rate ?? quote.rate;
    const atPromo = Math.min(converted, promo?.upTo ?? Infinity);
    const receive = atPromo * promoRate + (converted - atPromo) * quote.rate;
    offers.push({
      provider,
      quote,
      rate: receive / converted,
      fee,
      promo: Boolean(promo),
      receive,
      effectiveRate: receive / amount,
    });
  }
  return offers.sort((a, b) => b.rate - a.rate || b.receive - a.receive);
}

/**
 * The offer that delivers the most taka once fees are taken out, which isn't always the best rate.
 * Offers with an unpublished fee can't be judged on this, so they're left out.
 */
export function mostTaka(offers: Offer[]): Offer | undefined {
  return offers
    .filter((o) => !o.quote.feeUnknown)
    .reduce<Offer | undefined>((best, o) => (!best || o.receive > best.receive ? o : best), undefined);
}

/** Delivery methods that at least one of these working providers quotes for. */
export function availableMethods(providers: ProviderResult[]): DeliveryMethod[] {
  const order: DeliveryMethod[] = ["bank", "wallet", "cash"];
  const seen = new Set(providers.filter((p) => p.status === "ok").flatMap((p) => p.quotes.map((q) => q.method)));
  return order.filter((m) => seen.has(m));
}
