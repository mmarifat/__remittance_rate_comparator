// Bangladesh groups digits in lakhs and crores (1,63,450), same as the en-IN locale.
const bdt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export const formatBdt = (n: number) => `৳${bdt.format(Math.round(n))}`;

// Building an Intl.NumberFormat is slow and these run for every row on every render, so reuse them.
const moneyFormats = new Map<string, Intl.NumberFormat>();

function moneyFormat(currency: string, decimals: 0 | 2): Intl.NumberFormat {
  const key = `${currency}-${decimals}`;
  let format = moneyFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    moneyFormats.set(key, format);
  }
  return format;
}

/** An amount in the sending currency: £1,000 / €3.99 / US$25 / CA$1,000 (pence dropped on whole amounts). */
export function formatMoney(n: number, currency: string): string {
  return moneyFormat(currency, Number.isInteger(n) ? 0 : 2).format(n);
}

/** The symbol en-GB readers expect: £, €, US$, CA$. */
export function currencySymbol(currency: string): string {
  return moneyFormat(currency, 0).formatToParts(0).find((p) => p.type === "currency")?.value ?? currency;
}

export const formatRate = (n: number) => n.toFixed(2);

export function formatAgo(iso: string, now = Date.now()): string {
  const mins = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
