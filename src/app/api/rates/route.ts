import { fetchSnapshot } from "@/lib/snapshot";
import type { RatesSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Providers are queried at most once per this many seconds; everyone in between shares the result. */
const CACHE_SECONDS = 120;

// Per server instance: concurrent and back-to-back requests share one provider check.
let latest: { at: number; snapshot: Promise<RatesSnapshot> } | undefined;

function sharedSnapshot(): Promise<RatesSnapshot> {
  if (!latest || Date.now() - latest.at > CACHE_SECONDS * 1000) {
    latest = { at: Date.now(), snapshot: fetchSnapshot() };
  }
  return latest.snapshot;
}

export async function GET() {
  return Response.json(await sharedSnapshot(), {
    headers: {
      // Vercel's CDN serves one response to every visitor for CACHE_SECONDS, then keeps serving it
      // for up to a minute more while it fetches a fresh one in the background.
      "Cache-Control": `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`,
    },
  });
}
