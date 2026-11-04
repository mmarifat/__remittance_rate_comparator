import type { NextRequest } from "next/server";
import { DEFAULT_CORRIDOR, getCorridor } from "@/lib/corridors";
import { loadHistory } from "@/lib/historySource";

export const dynamic = "force-dynamic";

const DAYS = 7;

/** The last week of hourly rates for a corridor, trimmed from its full history on the `data` branch. */
export async function GET(request: NextRequest) {
  const corridor = getCorridor(request.nextUrl.searchParams.get("corridor") ?? DEFAULT_CORRIDOR);
  if (!corridor) return Response.json({ error: "Unknown corridor" }, { status: 400 });

  const since = Date.now() - DAYS * 86_400_000;
  const records = (await loadHistory(corridor.id)).filter((r) => Date.parse(r.t) >= since);
  return Response.json(
    { records },
    // New records land hourly, so the CDN can hold this for 30 minutes.
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600" } },
  );
}
