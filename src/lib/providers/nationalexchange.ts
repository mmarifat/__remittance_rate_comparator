import { destinationOf } from "../corridors";
import { getText, num } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";
import type { DeliveryMethod, Quote } from "../types";

const RATES_PAGE = "https://nationalexc.com/todays-rate/";

// National Exchange Company SRL, an Italian remittance house (not the UK's NEC Money).
const ROUTES: Routes = {
  "EUR-BDT": { url: "https://nationalexc.com/", countries: ["IT"] },
  "EUR-PKR": { url: "https://nationalexc.com/", countries: ["IT"] },
};

const METHODS: [RegExp, DeliveryMethod][] = [
  [/^Bank Deposit/, "bank"],
  [/^Cash Pay/, "cash"],
  [/^BKash\/Nagad/, "wallet"],
  [/^Mobile Wallet/, "wallet"],
];

/**
 * Reads one country's rows of the daily rates page, e.g. "Bangladesh 140.82 Bank Deposit - Any Bank".
 * The company doesn't publish its fees, so quotes are marked `feeUnknown`.
 */
export function parseNationalExchangeRates(html: string, countryName = "Bangladesh"): Quote[] {
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  const quotes: Quote[] = [];
  const row = new RegExp(`${countryName} ([\\d.]+) ([A-Za-z/ -]+?)(?= [A-Z][a-z]+ [\\d.]+ |$)`, "g");
  for (const m of text.matchAll(row)) {
    const method = METHODS.find(([pattern]) => pattern.test(m[2]))?.[1];
    if (method && !quotes.some((q) => q.method === method)) {
      quotes.push({ sendAmount: 1, rate: num(m[1]), fee: 0, method, feeUnknown: true });
    }
  }
  if (quotes.length === 0) throw new Error(`${countryName} rates not found on National Exchange's rates page`);
  return quotes;
}

export const nationalexchange: ProviderDef = {
  id: "nationalexchange",
  name: "National Exchange Co.",
  urlFor: urlsFrom(ROUTES),
  domain: "nationalexc.com",
  note: "Fees aren't published; confirm the total before paying",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
    return parseNationalExchangeRates(await getText(RATES_PAGE), destinationOf(corridor).countryName);
  },
};
