import { getJson, num } from "./http";
import { routeFor, urlsOf, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface FeedCorridor {
  isoCountryCode: string;
  currency: string;
  fxRate: string;
}

interface FxRates {
  availableCountries: { isoCountryCode: string; currency: string; corridors: FeedCorridor[] }[];
}

const URL = "https://www.taptapsend.com/send-money-to/bangladesh";

const ROUTES: Routes = {
  "GBP-BDT": { url: URL },
  "EUR-BDT": { url: URL },
  "USD-BDT": { url: URL },
  "CAD-BDT": { url: URL },
};

export const taptapsend: ProviderDef = {
  id: "taptapsend",
  name: "Taptap Send",
  urls: urlsOf(ROUTES),
  domain: "taptapsend.com",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
    // One feed lists every sending country's corridors.
    const res = await getJson<FxRates>("https://api.taptapsend.com/api/fxRates", {
      headers: { "Appian-Version": "web/2022-05-03.0", "X-Device-Id": "web", "X-Device-Model": "web" },
    });
    const sender = res.availableCountries.find(
      (c) => c.isoCountryCode === corridor.sendCountry && c.currency === corridor.from,
    );
    const route = sender?.corridors.find((c) => c.isoCountryCode === "BD" && c.currency === corridor.to);
    if (!route) throw new Error(`No ${corridor.sendCountry}→BD corridor`);
    const rate = num(route.fxRate);
    // One rate for every amount and delivery method, and no fee on these corridors.
    return (["bank", "wallet"] as const).map((method) => ({ sendAmount: 1, rate, fee: 0, method }));
  },
};
