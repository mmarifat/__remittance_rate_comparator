import type { History } from "@/lib/history";
import { HISTORY_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const DAYS = 7;

/** The last week of hourly rates, trimmed from the full history on the `data` branch. */
export async function GET() {
  let records: History["records"] = [];
  try {
    // HISTORY_URL can point a fork (or local testing) at a different history file.
    const url = process.env.HISTORY_URL ?? HISTORY_URL;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (res.ok) {
      const since = Date.now() - DAYS * 86_400_000;
      records = ((await res.json()) as History).records.filter((r) => Date.parse(r.t) >= since);
    }
  } catch {
    // No history yet (or GitHub unreachable): the page simply shows no trends.
  }
  return Response.json(
    { records },
    // New records land hourly, so the CDN can hold this for 30 minutes.
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600" } },
  );
}
