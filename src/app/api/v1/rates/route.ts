import { rates } from "@/lib/api/endpoints";
import { apiRoute } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
// A live check takes about 20 seconds at most (each provider is capped at 20, alongside the mid-market rate).
export const maxDuration = 60;

export const GET = apiRoute(rates);
