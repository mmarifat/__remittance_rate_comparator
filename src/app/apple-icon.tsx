import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners itself, so fill the whole square with the logo's green.
export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#006a4e" }}>
        <img src={await logoDataUri()} width={180} height={180} alt="" />
      </div>
    ),
    size,
  );
}
