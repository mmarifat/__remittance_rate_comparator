import { destinationOf, type Corridor, type CountryCode } from "../corridors";
import type { Quote } from "../types";
import { getText, num } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";

// LemFi prints its rate in the corridor page's HTML ("1 GBP = 370.42 PKR"), with the quote and fee rule
// in the page's Nuxt payload: one ordinary page load, the same any visitor gets. Its calculator's JSON
// API scrambles the rate, so it's deliberately not used (CONTRIBUTING.md: no getting around obfuscation).

const LOCALES: Partial<Record<CountryCode, string>> = {
  GB: "en-gb",
  IT: "en-it",
  FR: "en-fr",
  DE: "en-de",
  PT: "en-pt",
  IE: "en-ie",
  US: "en-us",
  CA: "en-ca",
};

const url = (country: CountryCode, corridor: Corridor) =>
  `https://lemfi.com/${LOCALES[country]}/international-money-transfer/${destinationOf(corridor).slug}`;

// LemFi doesn't send from the US to Bangladesh (its US Bangladesh page quotes rupees to India instead),
// and its Spanish euro page carries no quote.
const EURO = ["IT", "FR", "DE", "PT", "IE"] as const;
const ROUTES: Routes = {
  "GBP-BDT": { url },
  "EUR-BDT": { url, countries: EURO },
  "CAD-BDT": { url },
  "GBP-PKR": { url },
  "EUR-PKR": { url, countries: EURO },
  "USD-PKR": { url },
  "CAD-PKR": { url },
};

/** Rebuilds a value from Nuxt's payload format: a flat array where objects refer to other entries by index. */
function unflatten(payload: unknown[], index: unknown, depth = 0): unknown {
  if (typeof index !== "number" || index < 0 || depth > 20) return undefined;
  const value = payload[index];
  if (Array.isArray(value)) {
    // Reactive wrappers are ["Reactive", i]; plain arrays list indices.
    if (typeof value[0] === "string" && /^(Shallow)?(Reactive|Ref)$/.test(value[0])) return unflatten(payload, value[1], depth + 1);
    return value.map((i) => unflatten(payload, i, depth + 1));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, i]) => [k, unflatten(payload, i, depth + 1)]));
  }
  return value;
}

interface LemfiQuote {
  baseRate: string;
  rate: string;
  promotion: unknown;
  fee: { min: number | string; max: number | string; minTransactionAmount: number | string };
}

/**
 * Reads a LemFi corridor page. Checks the page is for the corridor asked about (sending country, and
 * both currencies in the printed rate), then turns LemFi's fee rule into quotes: a small fee up to a
 * threshold, and the `max` fee (usually none) above it.
 */
export function parseLemfiPage(html: string, corridor: Pick<Corridor, "from" | "to" | "sendCountry">): Quote[] {
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  const shown = text.match(/1 ([A-Z]{3}) = ([\d.,]+) ([A-Z]{3})/);
  if (!shown) throw new Error("Rate not found on LemFi's page");
  if (shown[1] !== corridor.from || shown[3] !== corridor.to) {
    throw new Error(`LemFi's page quotes ${shown[1]}→${shown[3]}, not ${corridor.from}→${corridor.to}`);
  }

  const json = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!json) throw new Error("No quote data on LemFi's page");
  const payload = JSON.parse(json) as unknown[];
  const root = unflatten(payload, 0) as {
    data?: Record<string, { quote?: LemfiQuote } | null>;
    state?: Record<string, unknown>;
  };
  const sender = (root.state?.["$scountry"] as { code?: string } | undefined)?.code;
  if (sender !== corridor.sendCountry) throw new Error(`LemFi's page is for sending from ${sender ?? "unknown"}`);
  // The key's suffix comes from a generated id, so match its start.
  const entry = Object.entries(root.data ?? {}).find(([key, v]) => key.startsWith("currency-converter") && v?.quote);
  const quote = entry?.[1]?.quote;
  if (!quote) throw new Error("No quote in LemFi's page data");

  // With a promotion on, `rate` is the promotional rate and `baseRate` the standard one.
  const rate = num(quote.baseRate ?? quote.rate);
  const promoRate = quote.promotion ? num(quote.rate) : undefined;
  const promo = promoRate && promoRate > rate ? { rate: promoRate } : undefined;

  // LemFi's own rule: no fee without a threshold; at or below it `min`; above it `max` (0 means free).
  const threshold = num(quote.fee.minTransactionAmount);
  const below = threshold > 0 ? num(quote.fee.min) : 0;
  const above = threshold > 0 && num(quote.fee.max) > 0 ? num(quote.fee.max) : 0;
  const tiers = threshold > 0 ? [{ from: 1, fee: below }, { from: Math.round((threshold + 0.01) * 100) / 100, fee: above }] : [{ from: 1, fee: 0 }];
  // Payouts are to bank accounts; LemFi's site doesn't confirm wallet payouts on these corridors.
  return tiers.map((t) => ({ sendAmount: t.from, rate, fee: t.fee, method: "bank" as const, promo }));
}

export const lemfi: ProviderDef = {
  id: "lemfi",
  name: "LemFi",
  urlFor: urlsFrom(ROUTES),
  domain: "lemfi.com",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
    return parseLemfiPage(await getText(url(corridor.sendCountry, corridor)), corridor);
  },
};
