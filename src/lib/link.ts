import {
  corridorFrom,
  DEFAULT_CORRIDOR,
  getCorridor,
  inCountry,
  type CorridorId,
  type CountryCode,
} from "./corridors";
import type { DeliveryMethod } from "./types";

export const DEFAULT_AMOUNT = "1000";
export const DEFAULT_METHOD: DeliveryMethod = "bank";
export const MAX_AMOUNT = 100_000;
const METHODS: DeliveryMethod[] = ["bank", "wallet", "cash"];

/** Everything a visitor picks, as kept in the page address. */
export interface LinkState {
  corridorId: CorridorId;
  country: CountryCode;
  amount: string;
  method: DeliveryMethod;
  newCustomer: boolean;
}

/** Where a visitor starts when the address doesn't say: their own currency and country. */
export interface Home {
  corridorId: CorridorId;
  country: CountryCode;
}

// Eurozone members without their own entry in the country picker get euro prices from the default
// euro country (Italy), the closest match we have.
const EUROZONE = new Set([
  "AT", "BE", "BG", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES",
]);

/** The starting corridor for a visitor from `countryCode` (ISO alpha-2, e.g. from Vercel's geolocation). */
export function homeFor(countryCode: string | null | undefined): Home {
  const code = countryCode?.toUpperCase() ?? "";
  if (EUROZONE.has(code)) {
    const eur = inCountry(getCorridor("EUR-BDT")!, code);
    return { corridorId: eur.id as CorridorId, country: eur.sendCountry };
  }
  const own = { US: "USD-BDT", CA: "CAD-BDT", GB: "GBP-BDT" }[code] as CorridorId | undefined;
  const corridor = getCorridor(own ?? DEFAULT_CORRIDOR)!;
  return { corridorId: corridor.id, country: corridor.sendCountry };
}

/** Accepts what the amount field accepts: up to 6 digits, 2 decimals, at most MAX_AMOUNT. */
export function isValidAmount(text: string): boolean {
  return /^\d{0,6}(\.\d{0,2})?$/.test(text) && Number(text) <= MAX_AMOUNT;
}

type Params = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Reads a (possibly shared) address, falling back to the visitor's home for anything missing or invalid. */
export function parseLink(params: Params, home: Home): LinkState {
  const fromParam = corridorFrom(first(params.from));
  const corridor = fromParam ?? getCorridor(home.corridorId)!;
  // A link's own currency starts from that currency's default country, not the visitor's.
  const baseCountry = fromParam && fromParam.id !== home.corridorId ? corridor.sendCountry : home.country;
  // An unusable ?country= falls back to baseCountry (not the corridor's default), so a Spanish visitor stays on Spain.
  const country = inCountry(inCountry(corridor, baseCountry), first(params.country)).sendCountry;
  const amount = first(params.amount) ?? "";
  const method = first(params.method) as DeliveryMethod | undefined;
  return {
    corridorId: corridor.id as CorridorId,
    country,
    amount: amount && isValidAmount(amount) ? amount : DEFAULT_AMOUNT,
    method: method && METHODS.includes(method) ? method : DEFAULT_METHOD,
    newCustomer: first(params.new) === "1",
  };
}

/**
 * The address query for a state. Values equal to the visitor's home are left out to keep links short,
 * so anything that differs from where they are (e.g. GBP chosen from Italy) is written out and
 * survives a reload.
 */
export function linkQuery(state: LinkState, home: Home): string {
  const corridor = getCorridor(state.corridorId)!;
  const params = new URLSearchParams();
  const sameCorridor = state.corridorId === home.corridorId;
  if (!sameCorridor) params.set("from", corridor.from);
  const countryDefault = sameCorridor ? home.country : corridor.sendCountry;
  if (state.country !== countryDefault) params.set("country", state.country);
  if (state.amount !== DEFAULT_AMOUNT) params.set("amount", state.amount);
  if (state.method !== DEFAULT_METHOD) params.set("method", state.method);
  if (state.newCustomer) params.set("new", "1");
  return params.toString();
}
