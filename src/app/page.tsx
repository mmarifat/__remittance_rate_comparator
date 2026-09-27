import { Suspense } from "react";
import { RateComparer } from "@/components/RateComparer";
import { RateComparerFromUrl } from "@/components/RateComparerFromUrl";
import { CORRIDORS } from "@/lib/corridors";
import { providers } from "@/lib/providers";
import { supports } from "@/lib/snapshot";

const providerCounts = Object.fromEntries(
  CORRIDORS.map((c) => [c.id, providers.filter((p) => supports(p, c)).length]),
);

export default function Home() {
  // The page is prerendered with the defaults; a shared link's currency, amount and method are read in the browser.
  return (
    <Suspense fallback={<RateComparer providerCounts={providerCounts} />}>
      <RateComparerFromUrl providerCounts={providerCounts} />
    </Suspense>
  );
}
