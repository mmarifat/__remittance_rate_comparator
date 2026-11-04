import type { Metadata } from "next";
import { headers } from "next/headers";
import { RateComparer } from "@/components/RateComparer";
import { CORRIDORS, inCountry } from "@/lib/corridors";
import { homeFor, parseLink } from "@/lib/link";
import { providers } from "@/lib/providers";
import { linkMetadata, titledCorridor } from "@/lib/seo";
import { supports } from "@/lib/snapshot";

// Keyed "EUR-BDT:ES": how many providers serve each corridor from each of its sending countries.
const providerCounts = Object.fromEntries(
  CORRIDORS.flatMap((c) =>
    c.sendCountries.map((country) => {
      const corridor = inCountry(c, country);
      return [`${c.id}:${country}`, providers.filter((p) => supports(p, corridor)).length];
    }),
  ),
);

// A shared link's title, description and share card follow the corridor it names. Only the link
// counts: crawlers fetch from their own countries, so the visitor's location plays no part here.
export async function generateMetadata({ searchParams }: PageProps<"/">): Promise<Metadata> {
  return linkMetadata(await searchParams);
}

export default async function Home({ searchParams }: PageProps<"/">) {
  // Vercel tells us where the visitor is, so they start on their own currency (and euro country).
  // A shared link's choices still win. Locally there's no header, so it starts on GBP.
  const home = homeFor((await headers()).get("x-vercel-ip-country"));
  const params = await searchParams;
  const initial = parseLink(params, home);
  return (
    <RateComparer providerCounts={providerCounts} initial={initial} home={home} titled={titledCorridor(params)} />
  );
}
