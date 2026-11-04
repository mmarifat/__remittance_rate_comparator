import type { NextRequest } from "next/server";
import { DEFAULT_CORRIDOR, getCorridor, inCountry } from "@/lib/corridors";
import { CACHE_SECONDS, sharedCheck } from "@/lib/liveCheck";
import { toSnapshot } from "@/lib/snapshot";
import type { RatesEvent } from "@/lib/types";

export const dynamic = "force-dynamic";
// The same limit as the API's live routes, so a host can serve them all from one function. A check takes about 20 seconds at most.
export const maxDuration = 60;

// Vercel's CDN serves one response per URL to every visitor for CACHE_SECONDS, then keeps serving
// it for up to a minute more while it fetches a fresh one in the background.
const CACHE_CONTROL = `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`;

/**
 * GET /api/rates?corridor=EUR-BDT&country=ES            → the whole snapshot as JSON, once every provider has answered.
 * GET /api/rates?corridor=EUR-BDT&country=ES&stream=1   → newline-delimited JSON events, one per provider as soon
 *                                                         as it answers, so the page can fill in the list progressively.
 * `corridor` defaults to GBP-BDT; `country` defaults to the corridor's first sending country.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const base = getCorridor(params.get("corridor") ?? DEFAULT_CORRIDOR);
  if (!base) return Response.json({ error: "Unknown corridor" }, { status: 400 });
  const corridor = inCountry(base, params.get("country"));
  const check = await sharedCheck(corridor);

  if (!params.has("stream")) {
    return Response.json(await toSnapshot(check), { headers: { "Cache-Control": CACHE_CONTROL } });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: RatesEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      send({
        type: "start",
        corridor: corridor.id,
        sendCountry: corridor.sendCountry,
        updatedAt: check.updatedAt,
        total: check.results.length,
      });
      send({ type: "midMarket", midMarket: await check.midMarket });
      await Promise.all(check.results.map((result) => result.then((provider) => send({ type: "provider", provider }))));
      send({ type: "done" });
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": CACHE_CONTROL },
  });
}
