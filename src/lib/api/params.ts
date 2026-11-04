import { CORRIDORS, findCorridor, getCorridor, type Corridor, type CountryCode } from "../corridors";
import { parseIsoDate } from "../isoDate";
import { MAX_AMOUNT } from "../link";
import type { DeliveryMethod } from "../types";
import { ApiError } from "./http";

const METHODS: DeliveryMethod[] = ["bank", "wallet", "cash"];

/**
 * The corridor a request is about: `corridor=GBP-PKR`, or `from=GBP&to=PKR`, plus an optional
 * `country` for currencies sent from several countries (euros). The country defaults to the
 * corridor's main one.
 */
export function corridorParam(params: URLSearchParams): Corridor {
  const id = params.get("corridor");
  const base = id ? getCorridor(id.toUpperCase()) : findCorridor(params.get("from"), params.get("to"));
  if (!base) {
    throw new ApiError(
      400,
      "invalid_corridor",
      `Pass corridor= (or from= and to=) as one of: ${CORRIDORS.map((c) => c.id).join(", ")}.`,
    );
  }
  const country = params.get("country")?.toUpperCase();
  if (!country) return base;
  if (!(base.sendCountries as readonly string[]).includes(country)) {
    throw new ApiError(400, "invalid_country", `${base.id} can be sent from: ${base.sendCountries.join(", ")}.`);
  }
  return { ...base, sendCountry: country as CountryCode };
}

export function amountParam(params: URLSearchParams): number {
  const raw = params.get("amount");
  const amount = Number(raw);
  if (raw === null || raw.trim() === "" || !Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    throw new ApiError(400, "invalid_amount", `amount must be a number above 0 and at most ${MAX_AMOUNT}.`);
  }
  return amount;
}

export function methodParam(params: URLSearchParams): DeliveryMethod {
  const raw = params.get("method") ?? "bank";
  if (!METHODS.includes(raw as DeliveryMethod)) {
    throw new ApiError(400, "invalid_method", `method must be one of: ${METHODS.join(", ")}.`);
  }
  return raw as DeliveryMethod;
}

export function booleanParam(params: URLSearchParams, name: string): boolean {
  const raw = params.get(name);
  if (raw === null || raw === "" || raw === "false" || raw === "0") return false;
  if (raw === "true" || raw === "1") return true;
  throw new ApiError(400, `invalid_${name.toLowerCase()}`, `${name} must be true or false.`);
}

/**
 * An ISO 8601 date, or date and time with `Z` or an offset. A date alone means the start of that UTC
 * day, or with `endOfDay` (for the end of a range) its last moment, so `until=2026-11-03` includes the 3rd.
 */
export function dateParam(params: URLSearchParams, name: string, { endOfDay = false } = {}): Date | undefined {
  // An unencoded "+" in an offset arrives as a space (query strings decode "+" that way); put it back.
  const raw = params.get(name)?.trim().replace(/(T[\d:.]+) (\d{2}:\d{2})$/i, "$1+$2");
  if (!raw) return undefined;
  const parsed = parseIsoDate(raw);
  if (!parsed) {
    throw new ApiError(
      400,
      `invalid_${name}`,
      `${name} must be an ISO 8601 date (2026-11-01) or a date and time with Z or an offset (2026-11-01T09:00:00Z).`,
    );
  }
  return endOfDay && parsed.dateOnly ? new Date(parsed.date.getTime() + 86_400_000 - 1) : parsed.date;
}
