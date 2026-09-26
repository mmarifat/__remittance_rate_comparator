import type { Quote } from "../types";

export interface ProviderDef {
  id: string;
  name: string;
  /** Public page where the user can start a transfer. */
  url: string;
  /** Provider's website domain, used to show its logo. */
  domain: string;
  /** Fixed caveat; a fetcher can also return one that depends on the response (e.g. a live promo). */
  note?: string;
  fetchQuotes: () => Promise<Quote[] | { quotes: Quote[]; note?: string }>;
}
