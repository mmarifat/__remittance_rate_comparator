import { usageByDay, utcDay } from "@/db/tenants";
import { buildOffers, mostReceived } from "../compare";
import { COUNTRIES, CORRIDORS, destinationOf, inCountry, type Corridor } from "../corridors";
import { sharedCheck } from "../liveCheck";
import { providers as registry } from "../providers";
import { supports, toSnapshot } from "../snapshot";
import type { ProviderResult, RatesSnapshot } from "../types";
import type { ApiContext } from "./handler";
import { amountParam, booleanParam, corridorParam, methodParam } from "./params";
import { forApi, servedByApi } from "./policy";

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;

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
