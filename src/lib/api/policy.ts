import { getCorridor, type Corridor } from "../corridors";
import type { ProviderResult, RatesSnapshot } from "../types";

/**
 * Providers left out of the API (they still show on the free comparison page). XE's quote responses
 * state that automated extraction of its rates is prohibited under its terms of use. Add more without
 * a code change with API_EXCLUDED_PROVIDERS=id,id, for example when a provider objects. The API stores
 * no rates, so there is nothing to purge. docs/market-research.md summarises each provider's terms.
 */
export const API_EXCLUDED_PROVIDERS: ReadonlySet<string> = new Set([
  "xe",
  ...(process.env.API_EXCLUDED_PROVIDERS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
]);

export const servedByApi = (provider: Pick<ProviderResult, "id">) => !API_EXCLUDED_PROVIDERS.has(provider.id);

export function forApi(snapshot: RatesSnapshot): RatesSnapshot {
  return { ...snapshot, providers: snapshot.providers.filter(servedByApi) };
}

/**
 * Whether a corridor has hourly history: the data-branch job records each corridor from its main
 * sending country only. Live rates work from every sending country.
 */
export function hasHistory(corridor: Corridor): boolean {
  return getCorridor(corridor.id)?.sendCountry === corridor.sendCountry;
}
