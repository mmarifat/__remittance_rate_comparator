import { atTiers, num, postJson } from "./http";
import { routeFor, urlsOf, type Routes } from "./routes";
import type { ProviderDef } from "./types";
import type { DeliveryMethod, Quote } from "../types";

interface XeQuote {
  quote: {
    individualQuotes: { deliveryMethod: string; settlementMethod: string; rate: number; transferFee: string }[];
  };
}

const METHODS: Record<string, DeliveryMethod> = { BankAccount: "bank", MobileWallet: "wallet", CashPayout: "cash" };

const URL = "https://www.xe.com/send-money/";
const ROUTES: Routes = { "GBP-BDT": { url: URL }, "EUR-BDT": { url: URL }, "USD-BDT": { url: URL }, "CAD-BDT": { url: URL } };

export const xe: ProviderDef = {
  id: "xe",
  name: "XE",
  urls: urlsOf(ROUTES),
  domain: "xe.com",
  fetchQuotes: (corridor) => {
    routeFor(ROUTES, corridor);
    return atTiers(async (amount) => {
      const res = await postJson<XeQuote>("https://launchpad-api.xe.com/v2/quotes", {
        sellCcy: corridor.from,
        buyCcy: corridor.to,
        userCountry: corridor.sendCountry,
        amount,
        fixedCcy: corridor.from,
        countryTo: "BD",
      });
      // One entry per way of paying × delivery method, and card payments cost more, so keep the
      // cheapest per delivery method.
      const best = new Map<DeliveryMethod, Quote>();
      for (const q of res.quote.individualQuotes) {
        const method = METHODS[q.deliveryMethod];
        if (!method) continue;
        const quote = { sendAmount: amount, rate: num(q.rate), fee: num(q.transferFee), method };
        const current = best.get(method);
        if (!current || quote.fee < current.fee) best.set(method, quote);
      }
      return [...best.values()];
    }, [100, 1000]);
  },
};
