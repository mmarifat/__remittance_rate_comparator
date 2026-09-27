import type { NextRequest } from "next/server";
import { DEFAULT_CORRIDOR, getCorridor } from "@/lib/corridors";
import type { History } from "@/lib/history";
import { HISTORY_BASE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const DAYS = 7;

/** The last week of hourly rates for a corridor, trimmed from its full history on the `data` branch. */
export async function GET(request: NextRequest) {
  const corridor = getCorridor(request.nextUrl.searchParams.get("corridor") ?? DEFAULT_CORRIDOR);
  if (!corridor) return Response.json({ error: "Unknown corridor" }, { status: 400 });

  let records: History["records"] = [];
  try {
    // HISTORY_BASE_URL can point a fork (or local testing) at a different history folder.
    const base = process.env.HISTORY_BASE_URL ?? HISTORY_BASE_URL;
    const get = (url: string) => fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    let res = await get(`${base}/${corridor.id}.json`);
    // Until the workflow's one-time move runs, GBP history is still the single file from before corridors.
    if (res.status === 404 && corridor.id === DEFAULT_CORRIDOR) res = await get(`${base}.json`);
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
