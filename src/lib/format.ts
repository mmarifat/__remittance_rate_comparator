// Bangladesh groups digits in lakhs and crores (1,63,450), same as the en-IN locale.
const bdt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const gbpWhole = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

export const formatBdt = (n: number) => `৳${bdt.format(Math.round(n))}`;

export const formatGbp = (n: number) => (Number.isInteger(n) ? gbpWhole.format(n) : gbp.format(n));

export const formatRate = (n: number) => n.toFixed(2);

export function formatAgo(iso: string, now = Date.now()): string {
  const mins = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
