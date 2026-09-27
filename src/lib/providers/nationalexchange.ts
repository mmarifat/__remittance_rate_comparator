import { getText, num } from "./http";
import { routeFor, urlsOf, type Routes } from "./routes";
import type { ProviderDef } from "./types";
import type { DeliveryMethod, Quote } from "../types";

const RATES_PAGE = "https://nationalexc.com/todays-rate/";

// National Exchange Company SRL, an Italian remittance house for Bangladesh (not the UK's NEC Money).
const ROUTES: Routes = { "EUR-BDT": { url: "https://nationalexc.com/" } };

const METHODS: [RegExp, DeliveryMethod][] = [
  [/^Bank Deposit/, "bank"],
  [/^Cash Pay/, "cash"],
  [/^BKash\/Nagad/, "wallet"],
];

/**
 * Reads the Bangladesh rows of the daily rates page, e.g. "Bangladesh 140.82 Bank Deposit - Any Bank".
 * The company doesn't publish its fees, so quotes are marked `feeUnknown`.
 */
export function parseNationalExchangeRates(html: string): Quote[] {
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  const quotes: Quote[] = [];
  for (const m of text.matchAll(/Bangladesh ([\d.]+) ([A-Za-z/ -]+?)(?= [A-Z][a-z]+ [\d.]+ |$)/g)) {
    const method = METHODS.find(([pattern]) => pattern.test(m[2]))?.[1];
    if (method && !quotes.some((q) => q.method === method)) {
      quotes.push({ sendAmount: 1, rate: num(m[1]), fee: 0, method, feeUnknown: true });
    }
  }
  if (quotes.length === 0) throw new Error("Bangladesh rates not found on National Exchange's rates page");
  return quotes;
}

export const nationalexchange: ProviderDef = {
  id: "nationalexchange",
  name: "National Exchange Co.",
  urls: urlsOf(ROUTES),
  domain: "nationalexc.com",
  note: "Fees aren't published; confirm the total before paying",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
    return parseNationalExchangeRates(await getText(RATES_PAGE));
  },
};
