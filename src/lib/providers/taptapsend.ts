import { getJson, num } from "./http";
import type { ProviderDef } from "./types";

interface Corridor {
  isoCountryCode: string;
  currency: string;
  fxRate: string;
}

interface FxRates {
  availableCountries: { isoCountryCode: string; corridors: Corridor[] }[];
}

export const taptapsend: ProviderDef = {
  id: "taptapsend",
  name: "Taptap Send",
  url: "https://www.taptapsend.com/send-money-to/bangladesh",
  domain: "taptapsend.com",
  async fetchQuotes() {
    const res = await getJson<FxRates>("https://api.taptapsend.com/api/fxRates", {
      headers: { "Appian-Version": "web/2022-05-03.0", "X-Device-Id": "web", "X-Device-Model": "web" },
    });
    const corridor = res.availableCountries
      .find((c) => c.isoCountryCode === "GB")
      ?.corridors.find((c) => c.isoCountryCode === "BD" && c.currency === "BDT");
    if (!corridor) throw new Error("No GB→BD corridor");
    const rate = num(corridor.fxRate);
    // One rate for every amount and delivery method, and no fee on this corridor.
    return (["bank", "wallet"] as const).map((method) => ({ sendAmount: 1, rate, fee: 0, method }));
  },
};
