import { Suspense } from "react";
import { RateComparer } from "@/components/RateComparer";
import { RateComparerFromUrl } from "@/components/RateComparerFromUrl";
import { providers } from "@/lib/providers";

export default function Home() {
  // The page is prerendered with the defaults; the link's amount and method are read in the browser.
  return (
    <Suspense fallback={<RateComparer providerCount={providers.length} />}>
      <RateComparerFromUrl providerCount={providers.length} />
    </Suspense>
  );
}
