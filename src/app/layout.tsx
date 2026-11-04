import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Anek_Bangla, Hind_Siliguri } from "next/font/google";
import { linkMetadata } from "@/lib/seo";
import { AUTHOR, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const anek = Anek_Bangla({
  variable: "--font-anek",
  subsets: ["latin", "bengali"],
  axes: ["wdth"],
});

const hind = Hind_Siliguri({
  variable: "--font-hind",
  subsets: ["latin", "bengali"],
  weight: ["400", "500", "600"],
});

// Site-wide fields, plus the generic description for anything that doesn't describe itself.
// The home page swaps in its link's corridor (see generateMetadata in page.tsx).
export const metadata: Metadata = {
  ...linkMetadata({}),
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  authors: [
    { name: AUTHOR.name, url: AUTHOR.github },
    { name: AUTHOR.name, url: AUTHOR.linkedin },
  ],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1a15" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anek.variable} ${hind.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
