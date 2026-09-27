import type { Corridor, CorridorId } from "../corridors";
import type { Quote } from "../types";

export interface ProviderDef {
  id: string;
  name: string;
  /** Where users start a transfer, per corridor. A provider is only checked for the corridors listed here. */
  urls: Partial<Record<CorridorId, string>>;
  /** Provider's website domain, used to show its logo. */
  domain: string;
  /** Fixed caveat; a fetcher can also return one that depends on the response (e.g. a live promo). */
  note?: string;
  fetchQuotes: (corridor: Corridor) => Promise<Quote[] | { quotes: Quote[]; note?: string }>;
}
