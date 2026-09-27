export type DeliveryMethod = "bank" | "wallet" | "cash";

/** One price point from a provider. */
export interface Quote {
  /** Amount, in the sending currency, the quote was requested for. */
  sendAmount: number;
  /** BDT the recipient gets per unit of the sending currency. */
  rate: number;
  /** Fee, in the sending currency, for sending `sendAmount`. */
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

/** One line of the /api/rates?stream=1 response (newline-delimited JSON). */
export type RatesEvent =
  | { type: "start"; corridor: string; updatedAt: string; total: number }
  | { type: "midMarket"; midMarket: number | null }
  | { type: "provider"; provider: ProviderResult }
  | { type: "done" };

export interface RatesSnapshot {
  /** Which route these rates are for, e.g. "GBP-BDT". */
  corridor: string;
  /** ISO timestamp of when the providers were queried. */
  updatedAt: string;
  /** Mid-market rate for the corridor, or null if it couldn't be fetched. */
  midMarket: number | null;
  providers: ProviderResult[];
}
