import { getText, num } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";
import type { Quote } from "../types";

const RATES_PAGE = "https://www.sonaliexchange.com/rates.asp";

// Sonali Exchange Co. Inc. is the US arm of Sonali Bank; the UK's SonaliPay is a separate company.
const ROUTES: Routes = { "USD-BDT": { url: "https://www.sonaliexchange.com/" } };

/**
 * Reads "Conversion Rate: 1 USD = 122.9 Taka" and the commission slabs ("$1 to $500 $2", ...,
 * "$2,001 & above $8") from the rates page. Each slab becomes a quote at its lower bound, so the
 * comparer picks the right fee for any amount.
 */
export function parseSonaliRates(html: string): Quote[] {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
  const rate = text.match(/1 USD\s*=\s*([\d.]+)\s*Taka/)?.[1];
  if (!rate) throw new Error("Rate not found on Sonali Exchange's rates page");
  const slabs = [...text.matchAll(/\$([\d,]+) (?:to \$[\d,]+|& above) \$([\d.]+)/g)].map((m) => ({
    from: num(m[1]),
    fee: num(m[2]),
  }));
  if (slabs.length === 0) throw new Error("Commission slabs not found on Sonali Exchange's rates page");
  return slabs.flatMap(({ from, fee }) =>
    (["bank", "cash"] as const).map((method) => ({ sendAmount: from, rate: num(rate), fee, method })),
  );
}

export const sonaliexchange: ProviderDef = {
  id: "sonaliexchange",
  name: "Sonali Exchange",
  urlFor: urlsFrom(ROUTES),
  domain: "sonaliexchange.com",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
    return parseSonaliRates(await getText(RATES_PAGE));
  },
};
