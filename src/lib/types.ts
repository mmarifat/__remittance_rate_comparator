export type DeliveryMethod = "bank" | "wallet" | "cash";

/** One price point from a provider. */
export interface Quote {
  /** GBP amount the quote was requested for. */
  sendAmount: number;
  /** BDT the recipient gets per £1 sent. */
  rate: number;
  /** GBP fee for sending `sendAmount`. */
  fee: number;
  method: DeliveryMethod;
}

export interface ProviderResult {
  id: string;
  name: string;
  /** Public page where the user can start a transfer. */
  url: string;
  /** Provider's website domain, used to show its logo. */
  domain: string;
  status: "ok" | "error";
  quotes: Quote[];
  /** Short caveat shown next to the provider, e.g. "First transfer promo rate". */
  note?: string;
  error?: string;
}

export interface RatesSnapshot {
  /** ISO timestamp of when the providers were queried. */
  updatedAt: string;
  /** Mid-market GBP→BDT rate, or null if it couldn't be fetched. */
  midMarket: number | null;
  providers: ProviderResult[];
}
