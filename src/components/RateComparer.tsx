"use client";

import { useEffect, useRef, useState } from "react";
import { availableMethods, buildOffers, mostTaka, type Offer } from "@/lib/compare";
import {
  appendRecord,
  bestRateTrend,
  providerTrend,
  toRecord,
  type History,
  type HistoryRecord,
  type TrendPoint,
} from "@/lib/history";
import { CORRIDORS, DEFAULT_CORRIDOR, corridorFrom, getCorridor, type CorridorId } from "@/lib/corridors";
import { currencySymbol, formatAgo, formatBdt, formatMoney, formatRate } from "@/lib/format";
import { AUTHOR, REPO_URL, SITE_NAME } from "@/lib/site";
import type { DeliveryMethod, ProviderResult, RatesEvent, RatesSnapshot } from "@/lib/types";
import Image from "next/image";
import { Rosette, Waves } from "./Guilloche";
import { ProviderLogo } from "./ProviderLogo";
import { Sparkline } from "./Sparkline";
import { useFlip } from "./useFlip";
import { useNow } from "./useNow";

const METHOD_LABEL: Record<DeliveryMethod, string> = {
  bank: "Bank account",
  wallet: "bKash / wallet",
  cash: "Cash pickup",
};

const METHOD_PAYOUT: Record<DeliveryMethod, string> = {
  bank: "bank account payout",
  wallet: "bKash / wallet payout",
  cash: "cash pickup",
};

// Corridors live in src/lib/corridors.ts; the "You send" list shows the ones with at least one provider.
const RECEIVE_CURRENCIES = [{ code: "BDT", name: "Taka" }];

const MAX_AMOUNT = 100_000;

/** After this long, a banner suggests refreshing because providers may have moved their rates. */
const STALE_AFTER_MINUTES = 10;

// rank · logo · service · [7-day trend] · rate · fee · recipient gets. The trend column only
// appears once there is history to show.
function rowGrid(trends: boolean) {
  return `grid grid-cols-[1.75rem_2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 sm:gap-x-4 ${
    trends
      ? "sm:grid-cols-[2rem_2.5rem_minmax(0,1fr)_4.5rem_5.5rem_4rem_7.5rem]"
      : "sm:grid-cols-[2rem_2.5rem_minmax(0,1fr)_6.5rem_5rem_8.5rem]"
  }`;
}

const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-sm transition hover:border-brand";

export const DEFAULT_AMOUNT = "1000";
export const DEFAULT_METHOD: DeliveryMethod = "bank";

/** Accepts what the amount field accepts: up to 6 digits, 2 decimals, at most MAX_AMOUNT. */
export function isValidAmount(text: string): boolean {
  return /^\d{0,6}(\.\d{0,2})?$/.test(text) && Number(text) <= MAX_AMOUNT;
}

// The amount and payout method live in the address, so a comparison can be shared as a link.
/** Replaces a provider's earlier result, or adds it if it's new. */
function upsertProvider(list: ProviderResult[], result: ProviderResult): ProviderResult[] {
  return list.some((p) => p.id === result.id) ? list.map((p) => (p.id === result.id ? result : p)) : [...list, result];
}

function syncUrl(amount: string, method: DeliveryMethod, corridorId: CorridorId) {
  const params = new URLSearchParams();
  if (corridorId !== DEFAULT_CORRIDOR) params.set("from", getCorridor(corridorId)!.from);
  if (amount !== DEFAULT_AMOUNT) params.set("amount", amount);
  if (method !== DEFAULT_METHOD) params.set("method", method);
  const query = params.toString();
  window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}

export function RateComparer({
  providerCounts,
  initialCorridor = DEFAULT_CORRIDOR,
  initialAmount = DEFAULT_AMOUNT,
  initialMethod = DEFAULT_METHOD,
}: {
  /** How many providers serve each corridor, for the loading message. */
  providerCounts: Record<string, number>;
  initialCorridor?: CorridorId;
  initialAmount?: string;
  initialMethod?: DeliveryMethod;
}) {
  const sendCurrencies = CORRIDORS.filter((c) => (providerCounts[c.id] ?? 0) > 0).map((c) => ({
    code: c.from,
    name: c.currencyName,
  }));
  const [corridorId, setCorridorId] = useState<CorridorId>(
    (providerCounts[initialCorridor] ?? 0) > 0 ? initialCorridor : DEFAULT_CORRIDOR,
  );
  const corridor = getCorridor(corridorId)!;
  const currency = corridor.from;
  const [latestSnapshot, setSnapshot] = useState<RatesSnapshot | null>(null);
  const [amountText, setAmountText] = useState(initialAmount);
  const [method, setMethodState] = useState<DeliveryMethod>(initialMethod);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  /** Providers answered so far in the check that's streaming in, or null when none is running. */
  const [progress, setProgress] = useState<{ received: number; total: number } | null>(null);
  const now = useNow();

  // Rates for another corridor (just switched away from) are never shown.
  const snapshot = latestSnapshot?.corridor === corridorId ? latestSnapshot : null;
  const amount = Number(amountText);
  const methods: DeliveryMethod[] = snapshot ? availableMethods(snapshot.providers) : ["bank", "wallet", "cash"];
  const activeMethod = methods.includes(method) ? method : (methods[0] ?? "bank");
  const offers = snapshot ? buildOffers(snapshot, amount, activeMethod) : [];
  const mostTakaId = offers.length > 1 ? mostTaka(offers)?.provider.id : undefined;

  const listRef = useRef<HTMLOListElement>(null);
  useFlip(listRef, offers.map((o) => o.provider.id).join());

  // Hourly history plus the rates on screen (once the check is complete), so each trend ends at "now".
  const [historyByCorridor, setHistoryByCorridor] = useState<Record<string, HistoryRecord[]>>({});
  const history = historyByCorridor[corridorId] ?? [];
  const records = snapshot && !loading ? appendRecord(history, toRecord(snapshot)) : history;
  const trends = new Map(
    now === null ? [] : offers.map((o) => [o.provider.id, providerTrend(records, o.provider.id, now)] as const),
  );
  // Wait for half a day of history before showing trends; a line over an hour or two says nothing.
  const showTrends = [...trends.values()].some((t) => t.length > 1 && t.at(-1)!.t - t[0].t >= 12 * 3_600_000);
  const bestTrend = now === null ? [] : bestRateTrend(records, now);
  const trendDays = bestTrend.length > 1 ? Math.round((bestTrend.at(-1)!.t - bestTrend[0].t) / 86_400_000) : 0;

  const failed = snapshot?.providers.filter((p) => p.status === "error") ?? [];
  const noMethod =
    snapshot?.providers.filter((p) => p.status === "ok" && !p.quotes.some((q) => q.method === activeMethod)) ?? [];

  const ago = snapshot && now !== null ? formatAgo(snapshot.updatedAt, now) : null;
  // Providers still to arrive that aren't on screen yet (none during a refresh of a full list).
  const pendingNew = (progress?.total ?? providerCounts[corridorId] ?? 0) - (snapshot?.providers.length ?? 0);
  const isStale =
    !loading && snapshot !== null && now !== null && now - Date.parse(snapshot.updatedAt) > STALE_AFTER_MINUTES * 60_000;

  useEffect(() => {
    let current = true;
    fetch(`/api/history?corridor=${corridorId}`)
      .then((res) => (res.ok ? (res.json() as Promise<History>) : { records: [] }))
      .then((h) => current && setHistoryByCorridor((all) => ({ ...all, [corridorId]: h.records })))
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [corridorId]);

  // Rates stream in one provider at a time, so the list fills in as answers arrive instead of
  // waiting for the slowest service. Bumping `requestId` (the Refresh button) runs it again;
  // rows already on screen stay put and update in place.
  const [requestId, setRequestId] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    const apply = (event: RatesEvent, startedAt: string) => {
      switch (event.type) {
        case "start":
          setProgress({ received: 0, total: event.total });
          setSnapshot((s) =>
            s?.corridor === event.corridor
              ? s
              : { corridor: event.corridor, updatedAt: event.updatedAt, midMarket: null, providers: [] },
          );
          break;
        case "midMarket":
          setSnapshot((s) => s && { ...s, midMarket: event.midMarket });
          break;
        case "provider":
          setSnapshot((s) => s && { ...s, providers: upsertProvider(s.providers, event.provider) });
          setProgress((p) => p && { ...p, received: p.received + 1 });
          break;
        case "done":
          setSnapshot((s) => s && { ...s, updatedAt: startedAt });
          break;
      }
    };

    (async () => {
      try {
        const res = await fetch(`/api/rates?corridor=${corridorId}&stream=1`, {
          cache: "no-store",
          signal: abort.signal,
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        let startedAt = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line) continue;
            const event = JSON.parse(line) as RatesEvent;
            if (event.type === "start") startedAt = event.updatedAt;
            apply(event, startedAt);
          }
        }
        setLoadFailed(false);
      } catch {
        if (!abort.signal.aborted) setLoadFailed(true);
      } finally {
        if (!abort.signal.aborted) {
          setLoading(false);
          setProgress(null);
        }
      }
    })();
    return () => abort.abort();
  }, [requestId, corridorId]);

  function refresh() {
    setLoading(true);
    setRequestId((n) => n + 1);
  }

  function onAmountChange(value: string) {
    const cleaned = value.replace(/[^\d.]/g, "");
    if (!isValidAmount(cleaned)) return;
    setAmountText(cleaned);
    syncUrl(cleaned, activeMethod, corridorId);
  }

  function setMethod(m: DeliveryMethod) {
    setMethodState(m);
    syncUrl(amountText, m, corridorId);
  }

  function changeCorridor(id: CorridorId) {
    if (id === corridorId) return;
    setCorridorId(id);
    setLoading(true);
    setProgress(null);
    syncUrl(amountText, activeMethod, id);
  }

  async function share() {
    const url = window.location.href;
    const best = offers[0];
    const text = best
      ? `Sending ${formatMoney(amount, currency)} to Bangladesh? ${best.provider.name} has the best rate right now: ${formatRate(best.quote.rate)}.`
      : `Compare ${currency} to BDT money transfer rates.`;
    // Phones get the native share sheet (WhatsApp etc.); desktops copy the link.
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ title: SITE_NAME, text, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-8">
      <header className="flex items-center justify-between gap-4 py-5">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="" width={30} height={30} unoptimized priority />
          <span className="figure-wide whitespace-nowrap text-sm font-semibold tracking-tight sm:text-lg">
            Remittance <span className="text-muted">Rate Comparator</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span aria-live="polite" className="hidden sm:inline">
            {loading
              ? progress
                ? `Checked ${progress.received} of ${progress.total}…`
                : "Checking every service…"
              : ago && `Updated ${ago}`}
          </span>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            title="Check every provider again"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 font-medium text-ink transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-50 sm:px-3.5"
          >
            <RefreshIcon spinning={loading} />
            {loading ? "Checking…" : "Refresh"}
          </button>
        </div>
      </header>

      {(isStale || (loadFailed && !loading && snapshot)) && (
        <div
          role="status"
          className="rise flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-sm text-warn-ink"
        >
          <p>
            {loadFailed
              ? `Couldn't refresh. These rates were checked ${ago}.`
              : `These rates were checked ${ago} and may have changed.`}
          </p>
          <button
            type="button"
            onClick={refresh}
            className="rounded-full bg-warn-ink px-3.5 py-1 font-semibold text-warn-bg transition hover:opacity-90"
          >
            Refresh rates
          </button>
        </div>
      )}

      <section className="rise pb-6 pt-6 sm:pt-10">
        <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-2">
          <CurrencySelect
            label="You send"
            options={sendCurrencies}
            value={currency}
            onChange={(code) => changeCorridor(corridorFrom(code)!.id)}
          />
          <span aria-hidden="true" className="text-muted">
            →
          </span>
          <CurrencySelect label="They receive" options={RECEIVE_CURRENCIES} value="BDT" />
          {corridor.from === "EUR" && (
            <span className="text-sm text-muted">Euro rates are for sending from {corridor.countryName}</span>
          )}
        </div>
        <h1 className="font-display text-[clamp(2.1rem,6vw,3.4rem)] font-semibold leading-[1.02] tracking-tight">
          Send{" "}
          <label className="inline-flex items-baseline whitespace-nowrap">
            <span className="sr-only">Total you pay, in {corridor.currencyName.toLowerCase()}s</span>
            <span className="text-brand">{currencySymbol(currency)}</span>
            {/* The invisible copy sizes the field to fit what's typed and keeps it on the headline's baseline. */}
            <span className="figure relative inline-block border-b-4 border-brand text-brand">
              <span aria-hidden="true" className="invisible whitespace-pre">
                {amountText || "0"}
              </span>
              <input
                value={amountText}
                onChange={(e) => onAmountChange(e.target.value)}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                size={1}
                className="absolute inset-0 w-full bg-transparent p-0 outline-none placeholder:text-brand/40"
              />
            </span>
          </label>{" "}
          to Bangladesh
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {methods.length > 1 && (
            <fieldset className="w-full sm:w-auto">
              <legend className="sr-only">Money arrives in</legend>
              <div className="grid grid-flow-col gap-1 rounded-full border border-line bg-card p-1 sm:inline-grid">
                {methods.map((m) => (
                  <label
                    key={m}
                    className="cursor-pointer whitespace-nowrap rounded-full px-3 py-1.5 text-center text-sm font-medium text-muted transition has-checked:bg-brand has-checked:text-paper has-focus-visible:outline-2 has-focus-visible:outline-brand sm:px-4"
                  >
                    <input
                      type="radio"
                      name="method"
                      value={m}
                      checked={activeMethod === m}
                      onChange={() => setMethod(m)}
                      className="sr-only"
                    />
                    {METHOD_LABEL[m]}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {snapshot?.midMarket && (
            <p className="text-sm text-muted">
              Mid-market{" "}
              <span className="figure text-base font-semibold text-ink">{formatRate(snapshot.midMarket)}</span>
            </p>
          )}
          <button type="button" onClick={share} className={`${CHIP} ml-auto font-medium`}>
            <ShareIcon />
            <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
          </button>
        </div>
      </section>

      <section aria-labelledby="list-heading" className="pb-10">
        <div className="relative flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
          {progress && (
            <div
              role="progressbar"
              aria-label="Services checked"
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.received}
              className="absolute inset-x-0 -bottom-px h-0.5 origin-left bg-brand transition-transform duration-300"
              style={{ transform: `scaleX(${progress.total ? progress.received / progress.total : 0})` }}
            />
          )}
          <h2 id="list-heading" className="font-display text-xl font-semibold">
            Best rate first
          </h2>
          <p className="text-sm text-muted">
            {amount > 0 && `Fees come out of the ${formatMoney(amount, currency)} you pay`}
            {ago && !loading && (
              <span className="sm:hidden">
                {amount > 0 && " · "}updated {ago}
              </span>
            )}
          </p>
        </div>

        {trendDays >= 1 && <BestRateSummary points={bestTrend} days={Math.min(trendDays, 7)} />}

        {offers.length > 0 && (
          <div
            className={`${rowGrid(showTrends)} hidden px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-muted sm:grid`}
          >
            <span />
            <span />
            <span>Service</span>
            {showTrends && <span>7 days</span>}
            <span className="text-right">Rate</span>
            <span className="text-right">Fee</span>
            <span className="text-right">Recipient gets</span>
          </div>
        )}

        <ol ref={listRef} className="mt-2 flex flex-col gap-1">
          {offers.map((offer, i) => (
            <OfferRow
              key={offer.provider.id}
              offer={offer}
              rank={i + 1}
              isMostTaka={offer.provider.id === mostTakaId}
              currency={currency}
              trend={showTrends ? (trends.get(offer.provider.id) ?? []) : undefined}
            />
          ))}
        </ol>

        {loading && pendingNew > 0 && (
          <LoadingRows
            rows={Math.min(3, pendingNew)}
            label={
              snapshot
                ? `Checking ${pendingNew} more ${pendingNew === 1 ? "service" : "services"}…`
                : `Getting live quotes from ${providerCounts[corridorId]} services…`
            }
          />
        )}

        {offers.length === 0 && !loading && (
          <p className="py-10 text-center text-muted">
            {snapshot === null
              ? "Couldn't load rates. Refresh to try again."
              : amount > 0
                ? "No live rates right now. Try Refresh in a minute."
                : "Enter an amount to compare."}
          </p>
        )}

        {(failed.length > 0 || noMethod.length > 0) && (
          <div className="mt-8 grid gap-6 rounded-2xl border border-dashed border-line p-5 sm:grid-cols-2">
            {failed.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold">Couldn&apos;t check just now</h3>
                <p className="mt-1 text-sm text-muted">
                  These services didn&apos;t respond to our last check, often because they limit how often they can be
                  asked. Their rate may still be good, so compare on their site.
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {failed.map((p) => (
                    <li key={p.id}>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" title={p.error} className={CHIP}>
                        <ProviderLogo name={p.name} domain={p.domain} size={18} />
                        {p.name} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {noMethod.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold">No {METHOD_PAYOUT[activeMethod]}</h3>
                <p className="mt-1 text-sm text-muted">These services pay out another way. Pick one to compare it.</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {noMethod.map((p) => {
                    const other = availableMethods([p]);
                    return (
                      <li key={p.id}>
                        <button type="button" onClick={() => setMethod(other[0])} className={CHIP}>
                          <ProviderLogo name={p.name} domain={p.domain} size={18} />
                          {p.name} · {other.map((m) => METHOD_LABEL[m]).join(", ")}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <footer className="border-t border-line py-8 text-sm leading-relaxed text-muted">
        <p className="max-w-2xl">
          Rates come from each service&apos;s public price calculator and are checked every few minutes. Some
          services give new customers a better first-transfer rate; we note those where we know. The final amount is
          set when you pay, so confirm it on their site. Remittance Rate Comparator isn&apos;t affiliated with any
          provider.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p>
            Made by <span className="font-medium text-ink">{AUTHOR.name}</span>. Open source:{" "}
            <a
              href={`${REPO_URL}/blob/main/CONTRIBUTING.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-brand"
            >
              add a provider or fix one
            </a>
            .
          </p>
          <ul className="flex gap-2">
            <li>
              <a href={AUTHOR.github} target="_blank" rel="noopener noreferrer" className={CHIP}>
                <GitHubIcon /> GitHub
              </a>
            </li>
            <li>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={CHIP}>
                <CodeIcon /> Source
              </a>
            </li>
            <li>
              <a href={AUTHOR.linkedin} target="_blank" rel="noopener noreferrer" className={CHIP}>
                <LinkedInIcon /> LinkedIn
              </a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

function OfferRow({
  offer,
  rank,
  isMostTaka,
  currency,
  trend,
}: {
  offer: Offer;
  rank: number;
  isMostTaka: boolean;
  currency: string;
  /** Set when the trend column is shown; may be too short to draw for a provider. */
  trend?: TrendPoint[];
}) {
  const { provider, quote } = offer;
  const top = rank === 1;
  const fee = quote.fee ? `${formatMoney(quote.fee, currency)} fee` : "No fee";

  return (
    <li
      data-flip={provider.id}
      className={`rise relative isolate overflow-hidden ${top ? "rounded-2xl bg-note text-note-ink shadow-[0_18px_40px_-24px_rgb(0_60_40/0.7)]" : "border-b border-line"}`}
    >
      {top && (
        <>
          <Rosette className="pointer-events-none absolute left-[-4.25rem] top-1/2 -z-10 size-56 -translate-y-1/2 sm:left-[-4rem]" />
          <Waves className="pointer-events-none absolute inset-x-0 bottom-1 -z-10 h-5 w-full" />
        </>
      )}
      <a
        href={provider.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${rowGrid(trend !== undefined)} group rounded-2xl px-3 transition ${top ? "py-6 focus-visible:outline-note-ink" : "py-4 hover:bg-card"}`}
      >
        <span
          className={`figure grid place-items-center rounded-full font-semibold ${
            top ? "size-8 bg-gold text-base text-[#0f2a22]" : "size-7 text-sm text-muted"
          }`}
        >
          {rank}
        </span>

        <ProviderLogo name={provider.name} domain={provider.domain} size={top ? 40 : 36} />

        <span className="min-w-0">
          {top && <span className="block text-[11px] font-medium uppercase tracking-[0.18em] opacity-75">Best rate</span>}
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`font-semibold ${top ? "text-lg" : ""}`}>{provider.name}</span>
            {isMostTaka && (
              <span
                className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${top ? "bg-note-ink/15" : "bg-green-soft text-brand"}`}
              >
                Most taka after fees
              </span>
            )}
          </span>
          <span className={`line-clamp-2 text-sm ${top ? "opacity-80" : "text-muted"}`}>
            <span className="sm:hidden">
              {fee} · {formatBdt(offer.receive)}
              {provider.note ? " · " : ""}
            </span>
            {provider.note}
          </span>
        </span>

        {trend !== undefined && (
          <span className="hidden sm:block">
            <Sparkline points={trend} onNote={top} />
          </span>
        )}

        <span className={`figure text-right font-semibold ${top ? "text-3xl sm:text-4xl" : "text-2xl"}`}>
          {formatRate(quote.rate)}
        </span>
        <span className={`hidden text-right text-sm sm:block ${top ? "" : "text-muted"}`}>
          {quote.fee ? formatMoney(quote.fee, currency) : "None"}
        </span>
        <span className={`figure hidden text-right text-xl sm:block ${top ? "font-semibold" : ""}`}>
          {formatBdt(offer.receive)}
        </span>
      </a>
    </li>
  );
}

function CurrencySelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { code: string; name: string }[];
  value: string;
  onChange?: (code: string) => void;
}) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={options.length < 2}
        className="figure-wide cursor-pointer appearance-none rounded-full border border-line bg-card py-1.5 pl-3.5 pr-8 text-sm font-semibold text-ink transition hover:border-brand"
      >
        {options.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} · {c.name}
          </option>
        ))}
      </select>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        aria-hidden="true"
        className="pointer-events-none absolute right-3 text-muted"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}

/** Answers "is today a good day to send?" by placing the current best rate in its recent range. */
function BestRateSummary({ points, days }: { points: TrendPoint[]; days: number }) {
  const rates = points.map((p) => p.rate);
  const now = rates.at(-1)!;
  const lo = Math.min(...rates);
  const hi = Math.max(...rates);
  const span = days === 1 ? "day" : `${days} days`;
  const text =
    hi === lo
      ? `The best rate hasn't moved in the last ${span}.`
      : now >= hi
        ? `Today's best rate is the highest in the last ${span}.`
        : now <= lo
          ? `Today's best rate is the lowest in the last ${span}.`
          : `Best rate over the last ${span}: ${formatRate(lo)} to ${formatRate(hi)}.`;
  return (
    <p className="flex items-center gap-3 px-3 pt-4 text-sm text-muted">
      <Sparkline points={points} />
      {text}
    </p>
  );
}

function LoadingRows({ rows, label }: { rows: number; label: string }) {
  return (
    <div aria-busy="true">
      <p className="px-3 pb-2 pt-4 text-sm text-muted">{label}</p>
      <ul aria-hidden="true" className="flex flex-col gap-1">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className={`${rowGrid(false)} border-b border-line px-3 py-4`}>
            <span className="mx-auto size-2 rounded-full bg-line" />
            <span className="size-9 rounded-xl bg-line motion-safe:animate-pulse" />
            <span className="flex flex-col gap-2">
              <span className="h-3.5 w-28 rounded bg-line motion-safe:animate-pulse" />
              <span className="h-3 w-40 rounded bg-line/60 motion-safe:animate-pulse sm:hidden" />
            </span>
            <span className="ml-auto h-6 w-16 rounded bg-line motion-safe:animate-pulse" />
            <span className="ml-auto hidden h-3.5 w-10 rounded bg-line/60 motion-safe:animate-pulse sm:block" />
            <span className="ml-auto hidden h-5 w-24 rounded bg-line/60 motion-safe:animate-pulse sm:block" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
      className={spinning ? "animate-spin motion-reduce:animate-none" : ""}
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}
