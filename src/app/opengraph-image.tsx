import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME}: live GBP to BDT rates, best rate first`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Share card in the site's banknote style: flag green, the red disc, and a ranked list teaser.
export default function Image() {
  const rows = ["Best rate first", "Fees included", "21 services"];
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
          background: "#006a4e",
          color: "#eef7f2",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: "#f42a41" }} />
          <div style={{ fontSize: 34, opacity: 0.85 }}>GBP → BDT · live rates</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 }}>Remittance</div>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 }}>Rate Comparator</div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {rows.map((r) => (
            <div
              key={r}
              style={{
                fontSize: 30,
                padding: "10px 24px",
                borderRadius: 999,
                border: "2px solid rgba(238,247,242,0.4)",
              }}
            >
              {r}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
