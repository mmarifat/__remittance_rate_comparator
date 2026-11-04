import { getDb } from "@/db/client";
import { pruneRateWindows } from "@/db/tenants";
import { isAuthorizedJob } from "@/lib/api/cron";
import { ApiError, errorResponse } from "@/lib/api/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/internal/maintenance: run daily by Vercel Cron (see vercel.json) to clear old rate-limit counters. */
export async function GET(request: Request) {
  if (!isAuthorizedJob(request)) return errorResponse(new ApiError(401, "unauthorized", "Not allowed."));
  const db = getDb();
  if (!db) return errorResponse(new ApiError(503, "not_configured", "No database is configured."));
  const windows = await pruneRateWindows(db, new Date(Date.now() - 86_400_000));
  return Response.json({ prunedRateWindows: windows }, { headers: { "Cache-Control": "no-store" } });
}
