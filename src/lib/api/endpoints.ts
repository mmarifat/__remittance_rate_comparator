import { usageByDay, utcDay } from "@/db/tenants";
import { buildOffers, mostReceived } from "../compare";
import { COUNTRIES, CORRIDORS, destinationOf, getCorridor, inCountry, type Corridor } from "../corridors";
import { dailySummary } from "../history";
import { loadHistory } from "../historySource";
import { sharedCheck } from "../liveCheck";
import { providers as registry } from "../providers";
import { supports, toSnapshot } from "../snapshot";
import type { ProviderResult, RatesSnapshot } from "../types";
import type { ApiContext } from "./handler";
import { ApiError } from "./http";
import { amountParam, booleanParam, corridorParam, dateParam, methodParam } from "./params";
import { forApi, hasHistory, servedByApi } from "./policy";

const DAY_MS = 86_400_000;
const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;
const nameOf = new Map(registry.map((p) => [p.id, p.name]));

function corridorSummary(corridor: Corridor) {
  const destination = destinationOf(corridor);
  return {
    corridor: corridor.id,
    from: corridor.from,
    to: corridor.to,
    sendCountry: corridor.sendCountry,
    receiveCountry: destination.country,
  };
}

/**
 * The corridor's providers checked live, through the same short shared cache as the comparison page:
 * callers within two minutes share one check, and nothing is stored in the database.
 */
async function liveSnapshot(corridor: Corridor): Promise<RatesSnapshot> {
  return forApi(await toSnapshot(await sharedCheck(corridor)));
}

function presentProvider(p: ProviderResult) {
  return {
    id: p.id,
    name: p.name,
    domain: p.domain,
    url: p.url,
    status: p.status,
    ...(p.note ? { note: p.note } : {}),
    ...(p.error ? { error: p.error } : {}),
    quotes: p.quotes.map((q) => ({
      method: q.method,
      sendAmount: q.sendAmount,
      rate: q.rate,
      fee: q.feeUnknown ? null : q.fee,
      feeUnknown: Boolean(q.feeUnknown),
      ...(q.promo ? { newCustomer: q.promo } : {}),
    })),
  };
}

/** GET /api/v1/corridors */
export async function listCorridors() {
  return {
    corridors: CORRIDORS.map((c) => ({
      id: c.id,
      from: c.from,
      to: c.to,
      receiveCountry: { code: destinationOf(c).country, name: destinationOf(c).countryName },
      sendCountries: c.sendCountries.map((code) => {
        const corridor = inCountry(c, code);
        return {
          code,
          name: COUNTRIES[code].name,
          default: code === c.sendCountry,
          history: hasHistory(corridor),
          providers: registry.filter((p) => servedByApi(p) && supports(p, corridor)).length,
        };
      }),
    })),
  };
}

/** GET /api/v1/providers[?corridor=GBP-PKR] */
export async function listProviders(ctx: ApiContext) {
  const only = ["corridor", "from", "to"].some((p) => ctx.params.has(p)) ? corridorParam(ctx.params) : undefined;
  const list = registry.filter(servedByApi).flatMap((p) => {
    const corridors = CORRIDORS.flatMap((c) => {
      if (only && only.id !== c.id) return [];
      const countries = c.sendCountries.filter((country) => supports(p, inCountry(c, country)));
      return countries.length ? [{ corridor: c.id, sendCountries: countries }] : [];
    });
    return corridors.length ? [{ id: p.id, name: p.name, domain: p.domain, corridors }] : [];
  });
  return { providers: list };
}

/** GET /api/v1/rates?corridor=GBP-PKR */
export async function rates(ctx: ApiContext) {
  const corridor = corridorParam(ctx.params);
  const snapshot = await liveSnapshot(corridor);
  return {
    ...corridorSummary(corridor),
    checkedAt: snapshot.updatedAt,
    midMarket: snapshot.midMarket,
    providers: snapshot.providers.map(presentProvider),
  };
}

/** GET /api/v1/compare?corridor=GBP-PKR&amount=500&method=wallet&newCustomer=true */
export async function compare(ctx: ApiContext) {
  const corridor = corridorParam(ctx.params);
  const amount = amountParam(ctx.params);
  const method = methodParam(ctx.params);
  const newCustomer = booleanParam(ctx.params, "newCustomer");
  const snapshot = await liveSnapshot(corridor);

  const offers = buildOffers(snapshot, amount, method, { newCustomer });
  const offered = new Set(offers.map((o) => o.provider.id));
  return {
    ...corridorSummary(corridor),
    checkedAt: snapshot.updatedAt,
    midMarket: snapshot.midMarket,
    amount,
    method,
    newCustomer,
    offers: offers.map((o, i) => ({
      rank: i + 1,
      provider: { id: o.provider.id, name: o.provider.name, domain: o.provider.domain, url: o.provider.url },
      rate: round(o.rate, 4),
      fee: o.quote.feeUnknown ? null : round(o.fee, 2),
      feeUnknown: Boolean(o.quote.feeUnknown),
      receive: round(o.receive, 2),
      effectiveRate: round(o.effectiveRate, 4),
      newCustomerPrice: o.promo,
      ...(o.provider.note ? { note: o.provider.note } : {}),
    })),
    bestRate: offers[0]?.provider.id ?? null,
    mostReceived: mostReceived(offers)?.provider.id ?? null,
    notOffered: snapshot.providers
      .filter((p) => !offered.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        reason: p.status === "error" ? "unavailable" : p.quotes.some((q) => q.method === method) ? "fee_exceeds_amount" : "method_not_offered",
      })),
  };
}

/** The data branch keeps 30 days of hourly records. */
const HISTORY_DAYS = 30;

/**
 * GET /api/v1/history?corridor=GBP-PKR&interval=hour|day&since=…&until=…&provider=wise
 * Each provider's headline rate, from the hourly records on the data branch (the last 30 days).
 */
export async function history(ctx: ApiContext) {
  const corridor = corridorParam(ctx.params);
  if (!hasHistory(corridor)) {
    throw new ApiError(404, "not_tracked", `${corridor.id} history is recorded for sending from ${getCorridor(corridor.id)!.sendCountry} only.`);
  }
  const interval = ctx.params.get("interval") ?? "hour";
  if (interval !== "hour" && interval !== "day") throw new ApiError(400, "invalid_interval", "interval must be hour or day.");
  const provider = ctx.params.get("provider") ?? undefined;
  if (provider && (!nameOf.has(provider) || !servedByApi({ id: provider }))) {
    throw new ApiError(400, "invalid_provider", `Unknown provider "${provider}". GET /api/v1/providers lists them.`);
  }

  // The range is since/until, because from/to name the currencies on every endpoint.
  const now = Date.now();
  let until = dateParam(ctx.params, "until", { endOfDay: true }) ?? new Date(now);
  const requestedSince = dateParam(ctx.params, "since") ?? new Date(until.getTime() - 7 * DAY_MS);
  if (requestedSince > until) throw new ApiError(400, "invalid_range", "since must be before until.");
  // History goes back 30 days; earlier dates are moved up to that.
  const earliest = new Date(now - HISTORY_DAYS * DAY_MS);
  if (until < earliest) {
    throw new ApiError(400, "range_outside_history", `History covers the last ${HISTORY_DAYS} days, from ${earliest.toISOString()}.`);
  }
  const limited = requestedSince < earliest;
  let since = limited ? earliest : requestedSince;
  if (interval === "day") {
    // Whole UTC days: until on to the end of its day, and since back to the start of its day, or on to the
    // next day's where history begins mid-day (unless that first day is all that's asked for).
    until = new Date(Math.floor(until.getTime() / DAY_MS) * DAY_MS + DAY_MS - 1);
    const dayStart = Math.floor(since.getTime() / DAY_MS) * DAY_MS;
    const start = dayStart < earliest.getTime() ? dayStart + DAY_MS : dayStart;
    if (start <= until.getTime()) since = new Date(start);
  }
  const range = { since: since.toISOString(), until: until.toISOString(), limited };
  const base = { ...corridorSummary(corridor), interval, ...range };

  const inRange = (await loadHistory(corridor.id)).filter((r) => {
    const t = Date.parse(r.t);
    return t >= since.getTime() && t <= until.getTime();
  });
  // Only the asked-for provider, and never one the API leaves out.
  const records = inRange.map((r) => ({
    ...r,
    r: Object.fromEntries(Object.entries(r.r).filter(([id]) => servedByApi({ id }) && (!provider || id === provider))),
  }));

  // Every provider in the range gets a series, even one that never answered (no points).
  const ids = [...new Set(records.flatMap((r) => Object.keys(r.r)))].sort();
  const series = (pointsOf: (id: string) => unknown[]) =>
    ids.map((id) => ({ provider: { id, name: nameOf.get(id) ?? id }, points: pointsOf(id) }));

  if (interval === "hour") {
    return {
      ...base,
      midMarket: records.flatMap((r) => (r.mid == null ? [] : [{ t: r.t, rate: r.mid }])),
      series: series((id) => records.flatMap((r) => (r.r[id] == null ? [] : [{ t: r.t, rate: r.r[id] }]))),
    };
  }

  const daily = dailySummary(records);
  return { ...base, midMarket: daily.midMarket, series: series((id) => daily.providers.get(id) ?? []) };
}

/** GET /api/v1/usage */
export async function usage(ctx: ApiContext) {
  const today = utcDay(ctx.now);
  const monthStart = `${today.slice(0, 8)}01`;
  const days = await usageByDay(ctx.db, ctx.caller.organizationId, monthStart);
  const used = days.reduce((sum, d) => sum + d.requests, 0);
  const planId = ctx.caller.plan;
  return {
    organization: { id: ctx.caller.organizationId, name: ctx.caller.organizationName },
    plan: { id: planId, ...ctx.plan },
    month: { start: monthStart, requests: used, remaining: Math.max(0, ctx.plan.requestsPerMonth - used) },
    days,
  };
}
