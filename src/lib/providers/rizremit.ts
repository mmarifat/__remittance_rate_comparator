import { destinationOf, type Corridor } from "../corridors";
import { getText, num } from "./http";
import type { ProviderDef } from "./types";
import { urlsFrom } from "./routes";

const page = (_country: string, corridor: Corridor) =>
  `https://rizremit.com/en-uk/send-money-to-${destinationOf(corridor).slug}`;

export const rizremit: ProviderDef = {
  id: "rizremit",
  name: "RizRemit",
  urlFor: urlsFrom({ "GBP-BDT": { url: page }, "GBP-PKR": { url: page } }),
  domain: "rizremit.com",
  async fetchQuotes(corridor) {
    // The rate and flat fee are server-rendered into the corridor page.
    const html = await getText(page("", corridor));
    const rate = html.match(/data-rate="([\d.]+)"/)?.[1];
    const fee = html.match(/&quot;fees&quot;:([\d.]+)/)?.[1];
    if (!rate || !fee) throw new Error("Rate not found on page");
    return (["bank", "cash"] as const).map((method) => ({ sendAmount: 1, rate: num(rate), fee: num(fee), method }));
  },
};
