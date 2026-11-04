import { destinationOf } from "../corridors";
import { num, postJson } from "./http";
import type { ProviderDef } from "./types";
import { urlsFrom } from "./routes";

export const necmoney: ProviderDef = {
  id: "necmoney",
  name: "NEC Money",
  urlFor: urlsFrom({ "GBP-BDT": { url: "https://www.necmoney.com/" }, "GBP-PKR": { url: "https://www.necmoney.com/" } }),
  domain: "necmoney.com",
  async fetchQuotes(corridor) {
    const res = await postJson<{ issueRate: number; fee: number }>("https://www.necmoney.com/api/rate", {
      ToCountryIsoCode: destinationOf(corridor).country,
      ToCurrencyIsoCode: corridor.to,
      FromCurrencyIsoCode: "GBP",
      FromCountryIsoCode: "GB",
    });
    return [{ sendAmount: 1, rate: num(res.issueRate), fee: num(res.fee), method: "bank" }];
  },
};
