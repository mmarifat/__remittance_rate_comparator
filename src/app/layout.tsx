import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Anek_Bangla, Hind_Siliguri } from "next/font/google";
import { AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME}: live money transfer rates to Bangladesh and Pakistan`,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "GBP to BDT",
    "EUR to BDT",
    "USD to BDT",
    "CAD to BDT",
    "GBP to PKR",
    "EUR to PKR",
    "USD to PKR",
    "CAD to PKR",
    "pound to taka",
    "dollar to taka",
    "euro to taka",
    "pound to rupee Pakistan",
    "send money to Bangladesh",
    "send money to Pakistan",
    "remittance Pakistan",
    "remittance Bangladesh",
    "UK to Bangladesh exchange rate",
    "best taka rate",
    "Remitly",
    "Wise",
    "Taptap Send",
    "SonaliPay",
    "RizRemit",
    "Western Union",
    "bKash",
    "JazzCash",
    "Easypaisa",
  ],
  authors: [
    { name: AUTHOR.name, url: AUTHOR.github },
    { name: AUTHOR.name, url: AUTHOR.linkedin },
  ],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: `${SITE_NAME}: live money transfer rates to Bangladesh and Pakistan`,
    description: SITE_DESCRIPTION,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME}: live money transfer rates to Bangladesh and Pakistan`,
    description: SITE_DESCRIPTION,
  },
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
