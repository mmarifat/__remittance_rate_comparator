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
  /** Set when the provider doesn't publish its fee; `fee` is then 0 and shouldn't be trusted. */
  feeUnknown?: boolean;
  /** A first-transfer deal for new customers, when the provider exposes one. */
  promo?: Promo;
}

export interface Promo {
  /** Better rate for a first transfer; the regular rate if omitted. */
  rate?: number;
  /** Lower (often zero) fee for a first transfer; the regular fee if omitted. */
  fee?: number;
  /** The better rate only covers this much of the transfer (sending currency); the rest gets the regular rate. */
  upTo?: number;
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
  | { type: "start"; corridor: string; sendCountry: string; updatedAt: string; total: number }
  | { type: "midMarket"; midMarket: number | null }
  | { type: "provider"; provider: ProviderResult }
  | { type: "done" };

export interface RatesSnapshot {
  /** Which route these rates are for, e.g. "GBP-BDT". */
  corridor: string;
  /** The sending country the rates are for (ISO alpha-2), e.g. "ES" for euros sent from Spain. */
  sendCountry: string;
  /** ISO timestamp of when the providers were queried. */
  updatedAt: string;
  /** Mid-market rate for the corridor, or null if it couldn't be fetched. */
  midMarket: number | null;
  providers: ProviderResult[];
}
