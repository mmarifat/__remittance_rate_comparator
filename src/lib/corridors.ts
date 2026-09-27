/** Sending countries, with the codes different providers want. */
export const COUNTRIES = {
  GB: { name: "United Kingdom", iso3: "GBR", numeric: 826 },
  IT: { name: "Italy", iso3: "ITA", numeric: 380 },
  ES: { name: "Spain", iso3: "ESP", numeric: 724 },
  FR: { name: "France", iso3: "FRA", numeric: 250 },
  DE: { name: "Germany", iso3: "DEU", numeric: 276 },
  PT: { name: "Portugal", iso3: "PRT", numeric: 620 },
  IE: { name: "Ireland", iso3: "IRL", numeric: 372 },
  US: { name: "United States", iso3: "USA", numeric: 840 },
  CA: { name: "Canada", iso3: "CAN", numeric: 124 },
} as const;

export type CountryCode = keyof typeof COUNTRIES;

/** A route money is sent along. Everything lands in Bangladesh for now; the sending side varies. */
export interface Corridor {
  id: string;
  /** Currency the sender pays in. */
  from: string;
  to: "BDT";
  /** The sending country providers are asked about (ISO 3166 alpha-2). */
  sendCountry: CountryCode;
  /** Countries a sender can choose between for this currency; the first is the default. */
  sendCountries: readonly CountryCode[];
  currencyName: string;
  /** Rough BDT per unit, used only to sanity-check quotes when no live mid-market rate is available. */
  typicalRate: number;
}

// Euro prices differ by country, so a euro sender picks theirs. Italy comes first: it has the largest
// Bangladeshi community in the eurozone and the widest provider coverage.
export const CORRIDORS = [
  { id: "GBP-BDT", from: "GBP", to: "BDT", sendCountry: "GB", sendCountries: ["GB"], currencyName: "Pound", typicalRate: 163 },
  {
    id: "EUR-BDT",
    from: "EUR",
    to: "BDT",
    sendCountry: "IT",
    sendCountries: ["IT", "ES", "FR", "DE", "PT", "IE"],
    currencyName: "Euro",
    typicalRate: 140,
  },
  { id: "USD-BDT", from: "USD", to: "BDT", sendCountry: "US", sendCountries: ["US"], currencyName: "US dollar", typicalRate: 123 },
  { id: "CAD-BDT", from: "CAD", to: "BDT", sendCountry: "CA", sendCountries: ["CA"], currencyName: "Canadian dollar", typicalRate: 87 },
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

/**
 * The corridor as seen from one of its sending countries. Unknown or unsupported countries fall back
 * to the corridor's default, so a bad ?country= in a link can't break anything.
 */
export function inCountry(corridor: Corridor, country: string | null | undefined): Corridor {
  const code = country?.toUpperCase() as CountryCode | undefined;
  return code && corridor.sendCountries.includes(code) ? { ...corridor, sendCountry: code } : corridor;
}
