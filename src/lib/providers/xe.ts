import { atTiers, num, postJson } from "./http";
import type { ProviderDef } from "./types";
import type { DeliveryMethod } from "../types";

interface XeQuote {
  quote: {
    individualQuotes: { deliveryMethod: string; settlementMethod: string; rate: number; transferFee: string }[];
  };
}

const METHODS: Record<string, DeliveryMethod> = { BankAccount: "bank", MobileWallet: "wallet", CashPayout: "cash" };

export const xe: ProviderDef = {
  id: "xe",
  name: "XE",
  url: "https://www.xe.com/send-money/",
  domain: "xe.com",
  fetchQuotes: () =>
    atTiers(async (amount) => {
      const res = await postJson<XeQuote>("https://launchpad-api.xe.com/v2/quotes", {
        sellCcy: "GBP",
        buyCcy: "BDT",
        userCountry: "GB",
        amount,
        fixedCcy: "GBP",
        countryTo: "BD",
      });
      // One entry per pay-in × delivery method; pay-in doesn't change the price, so keep the first per delivery.
      const seen = new Set<DeliveryMethod>();
      return res.quote.individualQuotes.flatMap((q) => {
        const method = METHODS[q.deliveryMethod];
        if (!method || seen.has(method)) return [];
        seen.add(method);
        return [{ sendAmount: amount, rate: num(q.rate), fee: num(q.transferFee), method }];
      });
    }, [100, 1000]),
};
