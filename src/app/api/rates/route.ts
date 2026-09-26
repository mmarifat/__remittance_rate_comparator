import { fetchSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

/** Asks every provider for a live quote on each call; nothing is cached. */
export async function GET() {
  return Response.json(await fetchSnapshot(), { headers: { "Cache-Control": "no-store" } });
}
