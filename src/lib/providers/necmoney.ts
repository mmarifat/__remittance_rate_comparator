import { num, postJson } from "./http";
import type { ProviderDef } from "./types";
import { urlsFrom } from "./routes";

export const necmoney: ProviderDef = {
  id: "necmoney",
  name: "NEC Money",
  urlFor: urlsFrom({ "GBP-BDT": { url: "https://www.necmoney.com/" } }),
  domain: "necmoney.com",
  async fetchQuotes() {
    const res = await postJson<{ issueRate: number; fee: number }>("https://www.necmoney.com/api/rate", {
      ToCountryIsoCode: "BD",
      ToCurrencyIsoCode: "BDT",
      FromCurrencyIsoCode: "GBP",
      FromCountryIsoCode: "GB",
    });
    return [{ sendAmount: 1, rate: num(res.issueRate), fee: num(res.fee), method: "bank" }];
  },
};
