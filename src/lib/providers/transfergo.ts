import { atTiers, getJson, num } from "./http";
import { routeFor, urlsOf, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface TransferGoQuotes {
  options: {
    isDefault: boolean;
    rate: { value: string };
    fee: { value: string };
    payOut: { code: string };
  }[];
}

// TransferGo sends from the UK and Europe; it doesn't offer US or Canadian senders.
const ROUTES: Routes = {
  "GBP-BDT": { url: "https://www.transfergo.com/send-money-to-bangladesh" },
  "EUR-BDT": { url: "https://www.transfergo.com/send-money-to-bangladesh" },
};

export const transfergo: ProviderDef = {
  id: "transfergo",
  name: "TransferGo",
  urls: urlsOf(ROUTES),
  domain: "transfergo.com",
  // TransferGo's Cloudflare rate limit is strict (an hour-long block after a burst), so ask for fewer tiers.
  fetchQuotes: (corridor) => {
    routeFor(ROUTES, corridor);
    return atTiers(async (amount) => {
      const res = await getJson<TransferGoQuotes>(
        `https://my.transfergo.com/api/booking/quotes?fromCurrencyCode=${corridor.from}&toCurrencyCode=${corridor.to}&fromCountryCode=${corridor.sendCountry}&toCountryCode=BD&amount=${amount}&calculationBase=sendAmount&business=0`,
      );
      return res.options.map((o) => ({
        sendAmount: amount,
        rate: num(o.rate.value),
        fee: num(o.fee.value),
        method: o.payOut.code === "mobileWallet" ? ("wallet" as const) : ("bank" as const),
      }));
    }, [100, 1000]);
  },
};
