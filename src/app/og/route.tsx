import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { logoDataUri } from "@/lib/logo";
import { linkSeo, OG_IMAGE_SIZE } from "@/lib/seo";

// A card depends only on its query, so the CDN keeps each one until the next deploy and browsers
// and crawlers for a day. Provider counts can change with a deploy, hence not longer.
const CACHE_CONTROL = "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400";

/**
 * GET /og?from=GBP&to=PKR&country=ES → the share card for that link (anything unrecognised gets the
 * generic card). The page's metadata links here; a file-convention opengraph-image can't see the query.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const seo = linkSeo({
    from: query.get("from") ?? undefined,
    to: query.get("to") ?? undefined,
    country: query.get("country") ?? undefined,
  });
  // Every spelling of a card is sent to its one address, so only a few dozen cards are ever drawn.
  if (request.nextUrl.search !== new URL(seo.image, request.nextUrl).search) {
    return new Response(null, { status: 308, headers: { Location: seo.image, "Cache-Control": CACHE_CONTROL } });
  }

  const logo = await logoDataUri();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0b3d2e",
          color: "#eef7f2",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse draws plain <img>, not next/image */}
          <img src={logo} width={72} height={72} alt="" style={{ borderRadius: 18, boxShadow: "0 0 0 3px rgba(238,247,242,0.35)" }} />
          <div style={{ fontSize: 34, opacity: 0.85 }}>{seo.card.line}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 }}>Remittance</div>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 }}>Rate Comparator</div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {seo.card.chips.map((chip) => (
            <div
              key={chip}
              style={{
                fontSize: 30,
                padding: "10px 24px",
                borderRadius: 999,
                border: "2px solid rgba(238,247,242,0.4)",
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE, headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
