import { atTiers, getJson, num } from "./http";
import type { ProviderDef } from "./types";

interface TransferGoQuotes {
  options: {
    isDefault: boolean;
    rate: { value: string };
    fee: { value: string };
    payOut: { code: string };
  }[];
}

export const transfergo: ProviderDef = {
  id: "transfergo",
  name: "TransferGo",
  url: "https://www.transfergo.com/send-money-to-bangladesh",
  domain: "transfergo.com",
  // TransferGo's Cloudflare rate limit is strict (an hour-long block after a burst), so ask for fewer tiers.
  fetchQuotes: () =>
    atTiers(async (amount) => {
      const res = await getJson<TransferGoQuotes>(
        `https://my.transfergo.com/api/booking/quotes?fromCurrencyCode=GBP&toCurrencyCode=BDT&fromCountryCode=GB&toCountryCode=BD&amount=${amount}&calculationBase=sendAmount&business=0`,
      );
      return res.options.map((o) => ({
        sendAmount: amount,
        rate: num(o.rate.value),
        fee: num(o.fee.value),
        method: o.payOut.code === "mobileWallet" ? ("wallet" as const) : ("bank" as const),
      }));
    }, [100, 1000]),
};
