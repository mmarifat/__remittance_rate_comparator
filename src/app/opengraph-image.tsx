import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/logo";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME}: live GBP to BDT rates, best rate first`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Share card: the logo, the name, and what the list does.
export default async function Image() {
  const logo = await logoDataUri();
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
          background: "#0b3d2e",
          color: "#eef7f2",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={logo} width={72} height={72} alt="" style={{ borderRadius: 18, boxShadow: "0 0 0 3px rgba(238,247,242,0.35)" }} />
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
