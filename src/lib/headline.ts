import { COUNTRIES, DESTINATIONS, type Corridor, type CountryCode } from "./corridors";

// Wording shared by the server's metadata (src/lib/seo.ts) and the page's tab title, kept apart from
// seo.ts so the browser bundle doesn't pull in the provider registry.

const SHORT_NAMES: Partial<Record<CountryCode, string>> = { GB: "UK", US: "US" };

/** "UK", "Spain": a sending country on its own. */
export const shortName = (country: CountryCode): string => SHORT_NAMES[country] ?? COUNTRIES[country].name;

/** "the UK", "Spain": a sending country as it reads after "from". */
export function place(country: CountryCode): string {
  const short = SHORT_NAMES[country];
  return short ? `the ${short}` : COUNTRIES[country].name;
}

/** "Send money from the UK to Pakistan: live GBP to PKR rates", what a corridor's page is called. */
export function corridorHeadline(corridor: Pick<Corridor, "from" | "to">, country: CountryCode): string {
  return `Send money from ${place(country)} to ${DESTINATIONS[corridor.to].countryName}: live ${corridor.from} to ${corridor.to} rates`;
}
