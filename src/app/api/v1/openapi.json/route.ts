import { openApiDocument } from "@/lib/api/openapi";
import { SITE_URL } from "@/lib/site";

/** The API's OpenAPI description. Public, so tools can read it before a key exists. */
export function GET() {
  return Response.json(openApiDocument(SITE_URL), {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
