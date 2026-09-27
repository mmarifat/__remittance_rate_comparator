import { atTiers, getJson, num } from "./http";
import type { ProviderDef } from "./types";
import { urlsFrom } from "./routes";

interface SonaliQuote {
  success: boolean;
  data: {
    exchangeRateApplied: number;
    /** Credit to another bank. */
    cobAcharges: number;
    /** Mobile wallet. */
    cmWcharges: number;
    /** Cash over the counter. */
    coCcharges: number;
  };
}

export const sonalipay: ProviderDef = {
  id: "sonalipay",
  name: "SonaliPay",
  urlFor: urlsFrom({ "GBP-BDT": { url: "https://www.sonalipay.co.uk/" } }),
  domain: "sonalipay.co.uk",
  fetchQuotes: () =>
    atTiers(async (amount) => {
      const { data } = await getJson<SonaliQuote>(
        `https://www.sonalipay.co.uk/SPLHome/LoadExchangeRateCalculator?SendingCurrency=GBP&ReceivingCurrency=BDT&amount=${amount}`,
        { headers: { "X-Requested-With": "XMLHttpRequest" } },
      );
      const rate = num(data.exchangeRateApplied);
      return [
        { sendAmount: amount, rate, fee: num(data.cobAcharges), method: "bank" as const },
        { sendAmount: amount, rate, fee: num(data.cmWcharges), method: "wallet" as const },
        { sendAmount: amount, rate, fee: num(data.coCcharges), method: "cash" as const },
      ];
    }),
};
