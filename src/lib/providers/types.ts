import type { Corridor } from "../corridors";
import type { Quote } from "../types";

export interface ProviderDef {
  id: string;
  name: string;
  /**
   * Where users start a transfer for this corridor and sending country, or undefined where the
   * provider doesn't offer it. Providers are only checked where this returns a link.
   */
  urlFor: (corridor: Corridor) => string | undefined;
  /** Provider's website domain, used to show its logo. */
  domain: string;
  /** Fixed caveat; a fetcher can also return one that depends on the response (e.g. a live promo). */
  note?: string;
  fetchQuotes: (corridor: Corridor) => Promise<Quote[] | { quotes: Quote[]; note?: string }>;
}
