import { RateComparer } from "@/components/RateComparer";
import { providers } from "@/lib/providers";

export default function Home() {
  return <RateComparer providerCount={providers.length} />;
}
