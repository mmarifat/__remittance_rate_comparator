import { getText, num } from "./http";
import type { ProviderDef } from "./types";
import { urlsFrom } from "./routes";

export const rizremit: ProviderDef = {
  id: "rizremit",
  name: "RizRemit",
  urlFor: urlsFrom({ "GBP-BDT": { url: "https://rizremit.com/en-uk/send-money-to-bangladesh" } }),
  domain: "rizremit.com",
  async fetchQuotes() {
    // The rate and flat fee are server-rendered into the corridor page.
    const html = await getText("https://rizremit.com/en-uk/send-money-to-bangladesh");
    const rate = html.match(/data-rate="([\d.]+)"/)?.[1];
    const fee = html.match(/&quot;fees&quot;:([\d.]+)/)?.[1];
    if (!rate || !fee) throw new Error("Rate not found on page");
    return (["bank", "cash"] as const).map((method) => ({ sendAmount: 1, rate: num(rate), fee: num(fee), method }));
  },
};
