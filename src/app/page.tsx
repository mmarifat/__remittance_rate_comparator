import { Suspense } from "react";
import { RateComparer } from "@/components/RateComparer";
import { RateComparerFromUrl } from "@/components/RateComparerFromUrl";
import { CORRIDORS, inCountry } from "@/lib/corridors";
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

export default function Home() {
  // The page is prerendered with the defaults; a shared link's choices are read in the browser.
  return (
    <Suspense fallback={<RateComparer providerCounts={providerCounts} />}>
      <RateComparerFromUrl providerCounts={providerCounts} />
    </Suspense>
  );
}
