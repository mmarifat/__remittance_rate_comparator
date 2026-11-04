import { destinationOf, type Corridor } from "../corridors";
import type { Quote } from "../types";
import { getJson, num } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface FeedCorridor {
  isoCountryCode: string;
  currency: string;
  fxRate: string;
}

interface FxRates {
  availableCountries: { isoCountryCode: string; currency: string; corridors: FeedCorridor[] }[];
}

const url = (_country: string, corridor: Corridor) =>
  `https://www.taptapsend.com/send-money-to/${destinationOf(corridor).slug}`;

const ROUTES: Routes = {
  "GBP-BDT": { url }, "EUR-BDT": { url }, "USD-BDT": { url }, "CAD-BDT": { url },
  "GBP-PKR": { url }, "EUR-PKR": { url }, "USD-PKR": { url }, "CAD-PKR": { url },
};

// The rate feed has no fees, so these come from Taptap Send's corridor pages (checked November 2026).
// To Bangladesh the fee depends on the payout: wallets are cheaper than banks and cash pickup.
const BDT_FEES: Record<string, { wallet: number; other: number }> = {
  GBP: { wallet: 0.99, other: 2.99 },
  USD: { wallet: 0.99, other: 2.99 },
  EUR: { wallet: 0.99, other: 2.99 },
  CAD: { wallet: 1.49, other: 3.99 },
};
// To Pakistan it's free from a minimum amount, and a small flat fee below it.
const PKR_FEES: Record<string, { freeFrom: number; below: number }> = {
  GBP: { freeFrom: 125, below: 0.99 },
  USD: { freeFrom: 200, below: 1.99 },
  EUR: { freeFrom: 170, below: 0.99 },
  CAD: { freeFrom: 250, below: 0.99 },
};

/** One rate for every amount and delivery method; only the fee differs. */
export function taptapQuotes(corridor: Pick<Corridor, "from" | "to">, rate: number): Quote[] {
  if (corridor.to === "PKR") {
    const fees = PKR_FEES[corridor.from];
    if (!fees) throw new Error(`No ${corridor.from} fee schedule`);
    return (["bank", "wallet", "cash"] as const).flatMap((method) => [
      { sendAmount: 1, rate, fee: fees.below, method },
      { sendAmount: fees.freeFrom, rate, fee: 0, method },
    ]);
  }
  const fees = BDT_FEES[corridor.from];
  if (!fees) throw new Error(`No ${corridor.from} fee schedule`);
  return (["bank", "wallet", "cash"] as const).map((method) => ({
    sendAmount: 1,
    rate,
    fee: method === "wallet" ? fees.wallet : fees.other,
    method,
  }));
}

export const taptapsend: ProviderDef = {
  id: "taptapsend",
  name: "Taptap Send",
  urlFor: urlsFrom(ROUTES),
  domain: "taptapsend.com",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
    // One feed lists every sending country's corridors.
    const res = await getJson<FxRates>("https://api.taptapsend.com/api/fxRates", {
      headers: { "Appian-Version": "web/2022-05-03.0", "X-Device-Id": "web", "X-Device-Model": "web" },
    });
    const sender = res.availableCountries.find(
      (c) => c.isoCountryCode === corridor.sendCountry && c.currency === corridor.from,
    );
    const { country } = destinationOf(corridor);
    const route = sender?.corridors.find((c) => c.isoCountryCode === country && c.currency === corridor.to);
    if (!route) throw new Error(`No ${corridor.sendCountry}→${country} corridor`);
    return taptapQuotes(corridor, num(route.fxRate));
  },
};
