"use client";

import { useEffect, useState } from "react";
import { availableMethods, buildOffers, mostTaka, type Offer } from "@/lib/compare";
import { formatAgo, formatBdt, formatGbp, formatRate } from "@/lib/format";
import { AUTHOR } from "@/lib/site";
import type { DeliveryMethod, RatesSnapshot } from "@/lib/types";
import { Rosette, Waves } from "./Guilloche";
import { ProviderLogo } from "./ProviderLogo";
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

const MAX_AMOUNT = 100_000;

/** After this long, a banner suggests refreshing because providers may have moved their rates. */
const STALE_AFTER_MINUTES = 10;

// rank · logo · service · rate · fee · recipient gets
const ROW_GRID =
  "grid grid-cols-[1.75rem_2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[2rem_2.5rem_minmax(0,1fr)_6.5rem_5rem_8.5rem] sm:gap-x-4";

const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-sm transition hover:border-flag-green";

export function RateComparer({ providerCount }: { providerCount: number }) {
  const [snapshot, setSnapshot] = useState<RatesSnapshot | null>(null);
  const [amountText, setAmountText] = useState("1000");
  const [method, setMethod] = useState<DeliveryMethod>("bank");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const now = useNow();

  const amount = Number(amountText);
  const methods: DeliveryMethod[] = snapshot ? availableMethods(snapshot.providers) : ["bank", "wallet", "cash"];
  const activeMethod = methods.includes(method) ? method : (methods[0] ?? "bank");
  const offers = snapshot ? buildOffers(snapshot, amount, activeMethod) : [];
  const mostTakaId = offers.length > 1 ? mostTaka(offers)?.provider.id : undefined;

  const failed = snapshot?.providers.filter((p) => p.status === "error") ?? [];
  const noMethod =
    snapshot?.providers.filter((p) => p.status === "ok" && !p.quotes.some((q) => q.method === activeMethod)) ?? [];

  const ago = snapshot && now !== null ? formatAgo(snapshot.updatedAt, now) : null;
  const isStale =
    !loading && snapshot !== null && now !== null && now - Date.parse(snapshot.updatedAt) > STALE_AFTER_MINUTES * 60_000;

  // Every load asks each provider for a live quote; nothing is cached on the server.
  // Bumping `requestId` (the Refresh button) runs the effect again.
  const [requestId, setRequestId] = useState(0);
  useEffect(() => {
    let current = true;
    fetch("/api/rates", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<RatesSnapshot>;
      })
      .then((data) => {
        if (!current) return;
        setSnapshot(data);
        setLoadFailed(false);
      })
      .catch(() => current && setLoadFailed(true))
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [requestId]);

  function refresh() {
    setLoading(true);
    setRequestId((n) => n + 1);
  }

  function onAmountChange(value: string) {
    const cleaned = value.replace(/[^\d.]/g, "");
    if (!/^\d{0,6}(\.\d{0,2})?$/.test(cleaned) || Number(cleaned) > MAX_AMOUNT) return;
    setAmountText(cleaned);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-8">
      <header className="flex items-center justify-between gap-4 py-5">
        <div className="flex items-center gap-2.5">
          <FlagMark />
          <span className="figure-wide whitespace-nowrap text-sm font-semibold tracking-tight sm:text-lg">
            Remittance <span className="text-muted">Rate Comparator</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span aria-live="polite" className="hidden sm:inline">
            {loading ? "Checking every service…" : ago && `Updated ${ago}`}
          </span>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            title="Check every provider again"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 font-medium text-ink transition hover:border-flag-green disabled:cursor-not-allowed disabled:opacity-50 sm:px-3.5"
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
        <p className="mb-3 flex items-center gap-2 text-sm text-muted">
          <span className="figure-wide rounded-full border border-line bg-card px-3 py-0.5 font-semibold text-ink">
            GBP → BDT
          </span>
          UK to Bangladesh is the only route for now
        </p>
        <h1 className="font-display text-[clamp(2.1rem,6vw,3.4rem)] font-semibold leading-[1.02] tracking-tight">
          Send{" "}
          <label className="inline-flex items-baseline whitespace-nowrap">
            <span className="sr-only">Total you pay, in pounds</span>
            <span className="text-flag-green">£</span>
            {/* The invisible copy sizes the field to fit what's typed and keeps it on the headline's baseline. */}
            <span className="figure relative inline-block border-b-4 border-flag-green text-flag-green">
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
                className="absolute inset-0 w-full bg-transparent p-0 outline-none placeholder:text-flag-green/40"
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
                    className="cursor-pointer whitespace-nowrap rounded-full px-3 py-1.5 text-center text-sm font-medium text-muted transition has-checked:bg-flag-green has-checked:text-paper has-focus-visible:outline-2 has-focus-visible:outline-flag-green sm:px-4"
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
        </div>
      </section>

      <section aria-labelledby="list-heading" className="pb-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
          <h2 id="list-heading" className="font-display text-xl font-semibold">
            Best rate first
          </h2>
          <p className="text-sm text-muted">
            {amount > 0 && `Fees come out of the ${formatGbp(amount)} you pay`}
            {ago && !loading && (
              <span className="sm:hidden">
                {amount > 0 && " · "}updated {ago}
              </span>
            )}
          </p>
        </div>

        {offers.length > 0 && (
          <div
            className={`${ROW_GRID} hidden px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-muted sm:grid`}
          >
            <span />
            <span />
            <span>Service</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Fee</span>
            <span className="text-right">Recipient gets</span>
          </div>
        )}

        <ol className="mt-2 flex flex-col gap-1">
          {offers.map((offer, i) => (
            <OfferRow key={offer.provider.id} offer={offer} rank={i + 1} isMostTaka={offer.provider.id === mostTakaId} />
          ))}
        </ol>

        {snapshot === null && loading && <LoadingRows providerCount={providerCount} />}

        {offers.length === 0 && !(snapshot === null && loading) && (
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
            Made by <span className="font-medium text-ink">{AUTHOR.name}</span>
          </p>
          <ul className="flex gap-2">
            <li>
              <a href={AUTHOR.github} target="_blank" rel="noopener noreferrer" className={CHIP}>
                <GitHubIcon /> GitHub
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

function OfferRow({ offer, rank, isMostTaka }: { offer: Offer; rank: number; isMostTaka: boolean }) {
  const { provider, quote } = offer;
  const top = rank === 1;
  const fee = quote.fee ? `${formatGbp(quote.fee)} fee` : "No fee";

  return (
    <li
      className={`rise relative isolate overflow-hidden ${top ? "rounded-2xl bg-note text-note-ink shadow-[0_18px_40px_-24px_rgb(0_60_40/0.7)]" : "border-b border-line"}`}
      style={{ animationDelay: `${rank * 35}ms` }}
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
        className={`${ROW_GRID} group rounded-2xl px-3 transition ${top ? "py-6 focus-visible:outline-note-ink" : "py-4 hover:bg-card"}`}
      >
        <span
          className={`figure grid place-items-center rounded-full font-semibold ${
            top ? "size-8 bg-flag-red text-base text-white" : "size-7 text-sm text-muted"
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
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${top ? "bg-note-ink/15" : "bg-green-soft text-flag-green"}`}
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

        <span className={`figure text-right font-semibold ${top ? "text-3xl sm:text-4xl" : "text-2xl"}`}>
          {formatRate(quote.rate)}
        </span>
        <span className={`hidden text-right text-sm sm:block ${top ? "" : "text-muted"}`}>
          {quote.fee ? formatGbp(quote.fee) : "None"}
        </span>
        <span className={`figure hidden text-right text-xl sm:block ${top ? "font-semibold" : ""}`}>
          {formatBdt(offer.receive)}
        </span>
      </a>
    </li>
  );
}

function LoadingRows({ providerCount }: { providerCount: number }) {
  return (
    <div aria-busy="true">
      <p className="px-3 pb-2 pt-4 text-sm text-muted">Getting live quotes from {providerCount} services…</p>
      <ul aria-hidden="true" className="flex flex-col gap-1">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className={`${ROW_GRID} border-b border-line px-3 py-4`}>
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

function LinkedInIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

function FlagMark() {
  return (
    <svg width="30" height="20" viewBox="0 0 30 20" aria-hidden="true" className="shrink-0">
      <rect width="30" height="20" rx="4" fill="#006a4e" />
      <circle cx="13.5" cy="10" r="5.5" fill="#f42a41" />
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
