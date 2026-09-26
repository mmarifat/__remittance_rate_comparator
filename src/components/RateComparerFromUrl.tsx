"use client";

import { useSearchParams } from "next/navigation";
import type { DeliveryMethod } from "@/lib/types";
import { DEFAULT_AMOUNT, DEFAULT_METHOD, isValidAmount, RateComparer } from "./RateComparer";

const METHODS: DeliveryMethod[] = ["bank", "wallet", "cash"];

/** Starts the comparer from a shared link's ?amount= and ?method=, ignoring values it can't use. */
export function RateComparerFromUrl({ providerCount }: { providerCount: number }) {
  const params = useSearchParams();
  const amount = params.get("amount") ?? "";
  const method = params.get("method") as DeliveryMethod | null;
  return (
    <RateComparer
      providerCount={providerCount}
      initialAmount={amount && isValidAmount(amount) ? amount : DEFAULT_AMOUNT}
      initialMethod={method && METHODS.includes(method) ? method : DEFAULT_METHOD}
    />
  );
}
