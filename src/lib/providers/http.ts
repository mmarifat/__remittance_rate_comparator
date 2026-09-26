import { REPO_URL, SITE_NAME } from "../site";
import type { Quote } from "../types";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Accept-Language": "en-GB,en;q=0.9",
  // Tells providers who is asking: an open source comparison site, with a link to its code.
  "X-Open-Source-Client": `${SITE_NAME} (+${REPO_URL})`,
};

const TIMEOUT_MS = 10_000;

/** fetch with browser-like headers, a timeout, one retry on 429, and an error on non-2xx. */
export async function request(url: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...DEFAULT_HEADERS, ...init.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (res.status === 429 && !retried) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return request(url, init, true);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res;
}

export async function getJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await request(url, { ...init, headers: { Accept: "application/json", ...init.headers } });
  return res.json() as Promise<T>;
}

export async function postJson<T>(url: string, body: unknown, init: RequestInit = {}): Promise<T> {
  return getJson<T>(url, {
    ...init,
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...init.headers },
  });
}

export async function postForm<T>(url: string, form: Record<string, string>, init: RequestInit = {}): Promise<T> {
  return getJson<T>(url, {
    ...init,
    method: "POST",
    body: new URLSearchParams(form).toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...init.headers },
  });
}

export async function getText(url: string, init: RequestInit = {}): Promise<string> {
  const res = await request(url, init);
  return res.text();
}

/** Amounts (GBP) we ask amount-sensitive providers to quote, so fees and tiered rates show up. */
export const TIERS = [100, 500, 1000, 2500];

/**
 * Quote at each tier, one request at a time (bursts trip rate limits).
 * Tolerates some tiers failing, but not all.
 */
export async function atTiers(
  quoteFor: (amount: number) => Promise<Quote | Quote[]>,
  tiers: number[] = TIERS,
): Promise<Quote[]> {
  const quotes: Quote[] = [];
  let firstError: unknown;
  for (const amount of tiers) {
    try {
      quotes.push(...[await quoteFor(amount)].flat());
    } catch (err) {
      firstError ??= err;
    }
  }
  if (quotes.length === 0) throw firstError ?? new Error("No quotes returned");
  return quotes;
}

export function num(value: unknown): number {
  const n = typeof value === "string" ? Number.parseFloat(value.replace(/,/g, "")) : Number(value);
  if (!Number.isFinite(n)) throw new Error(`Expected a number, got ${JSON.stringify(value)}`);
  return n;
}
