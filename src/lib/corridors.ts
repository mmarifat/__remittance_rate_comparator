/** A route money is sent along. Everything lands in Bangladesh for now; the sending side varies. */
export interface Corridor {
  id: string;
  /** Currency the sender pays in. */
  from: string;
  to: "BDT";
  /** ISO 3166 alpha-2 code of the sending country that providers are asked about. */
  sendCountry: string;
  countryName: string;
  currencyName: string;
  /** Rough BDT per unit, used only to sanity-check quotes when no live mid-market rate is available. */
  typicalRate: number;
}

export const CORRIDORS = [
  { id: "GBP-BDT", from: "GBP", to: "BDT", sendCountry: "GB", countryName: "United Kingdom", currencyName: "Pound", typicalRate: 163 },
  { id: "EUR-BDT", from: "EUR", to: "BDT", sendCountry: "IT", countryName: "Italy", currencyName: "Euro", typicalRate: 140 },
  { id: "USD-BDT", from: "USD", to: "BDT", sendCountry: "US", countryName: "United States", currencyName: "US dollar", typicalRate: 123 },
  { id: "CAD-BDT", from: "CAD", to: "BDT", sendCountry: "CA", countryName: "Canada", currencyName: "Canadian dollar", typicalRate: 87 },
] as const satisfies readonly Corridor[];

export type CorridorId = (typeof CORRIDORS)[number]["id"];

export const DEFAULT_CORRIDOR: CorridorId = "GBP-BDT";

export function getCorridor(id: string | null | undefined): (typeof CORRIDORS)[number] | undefined {
  return CORRIDORS.find((c) => c.id === id);
}

/** Looks a corridor up by its sending currency, as used in shareable links (?from=EUR). */
export function corridorFrom(currency: string | null | undefined): (typeof CORRIDORS)[number] | undefined {
  return CORRIDORS.find((c) => c.from === currency?.toUpperCase());
}
