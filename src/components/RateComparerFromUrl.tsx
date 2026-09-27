"use client";

import { useSearchParams } from "next/navigation";
import { corridorFrom, DEFAULT_CORRIDOR } from "@/lib/corridors";
import type { DeliveryMethod } from "@/lib/types";
import { DEFAULT_AMOUNT, DEFAULT_METHOD, isValidAmount, RateComparer } from "./RateComparer";

const METHODS: DeliveryMethod[] = ["bank", "wallet", "cash"];

/**
 * Starts the comparer from a shared link's ?from=, ?country=, ?amount=, ?method= and ?new=,
 * ignoring values it can't use.
 */
export function RateComparerFromUrl({ providerCounts }: { providerCounts: Record<string, number> }) {
  const params = useSearchParams();
  const amount = params.get("amount") ?? "";
  const method = params.get("method") as DeliveryMethod | null;
  return (
    <RateComparer
      providerCounts={providerCounts}
      initialCorridor={corridorFrom(params.get("from"))?.id ?? DEFAULT_CORRIDOR}
      initialCountry={params.get("country")}
      initialAmount={amount && isValidAmount(amount) ? amount : DEFAULT_AMOUNT}
      initialMethod={method && METHODS.includes(method) ? method : DEFAULT_METHOD}
      initialNewCustomer={params.get("new") === "1"}
    />
  );
}
