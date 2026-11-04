import { usage } from "@/lib/api/endpoints";
import { apiRoute } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export const GET = apiRoute(usage);
