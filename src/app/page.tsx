import { headers } from "next/headers";
import { RateComparer } from "@/components/RateComparer";
import { CORRIDORS, inCountry } from "@/lib/corridors";
import { homeFor, parseLink } from "@/lib/link";
import { providers } from "@/lib/providers";
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

export default async function Home({ searchParams }: PageProps<"/">) {
  // Vercel tells us where the visitor is, so they start on their own currency (and euro country).
  // A shared link's choices still win. Locally there's no header, so it starts on GBP.
  const home = homeFor((await headers()).get("x-vercel-ip-country"));
  const initial = parseLink(await searchParams, home);
  return <RateComparer providerCounts={providerCounts} initial={initial} home={home} />;
}
