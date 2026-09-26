import { formatRate } from "@/lib/format";
import type { TrendPoint } from "@/lib/history";

const W = 72;
const H = 24;
const PAD = 3;

/** Describes a trend in words, for the tooltip and screen readers. */
export function describeTrend(points: TrendPoint[]): string {
  const rates = points.map((p) => p.rate);
  const first = points[0];
  const last = points.at(-1)!;
  const change = last.rate - first.rate;
  const since = new Date(first.t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const direction = Math.abs(change) < 0.005 ? "no change" : `${change > 0 ? "up" : "down"} ${formatRate(Math.abs(change))}`;
  return `Since ${since}: ${formatRate(Math.min(...rates))} to ${formatRate(Math.max(...rates))}, now ${formatRate(last.rate)} (${direction})`;
}

/**
 * A rate over time: a muted line with the latest point marked in the accent colour.
 * `onNote` switches to colours that read on the green top row.
 */
export function Sparkline({ points, onNote = false }: { points: TrendPoint[]; onNote?: boolean }) {
  if (points.length < 2) return null;
  const t0 = points[0].t;
  const t1 = points.at(-1)!.t;
  const rates = points.map((p) => p.rate);
  const lo = Math.min(...rates);
  const hi = Math.max(...rates);
  const x = (t: number) => PAD + ((t - t0) / (t1 - t0 || 1)) * (W - 2 * PAD);
  const y = (r: number) => (hi === lo ? H / 2 : PAD + (1 - (r - lo) / (hi - lo)) * (H - 2 * PAD));
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.rate).toFixed(1)}`).join("");
  const last = points.at(-1)!;
  const label = describeTrend(points);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block overflow-visible">
      <title>{label}</title>
      <path
        d={d}
        fill="none"
        stroke={onNote ? "var(--note-ink)" : "var(--muted)"}
        strokeOpacity={onNote ? 0.65 : 0.9}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={x(last.t)} cy={y(last.rate)} r="2.75" fill={onNote ? "var(--gold)" : "var(--brand)"} />
    </svg>
  );
}
