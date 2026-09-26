import { num, postJson, request } from "./http";
import type { ProviderDef } from "./types";
import type { DeliveryMethod, Quote } from "../types";

interface Remittance {
  quote: {
    pricing: { disbursementType: string; fxRate: { rate: string }; feeAmount: { rawValue: string } }[];
  };
}

const METHODS: Record<string, DeliveryMethod> = { DEPOSIT: "bank", MOBILE_WALLET: "wallet", PICKUP: "cash" };
const AMOUNT = 1000;

export const xoom: ProviderDef = {
  id: "xoom",
  name: "Xoom",
  url: "https://www.xoom.com/bangladesh/send-money",
  domain: "xoom.com",
  async fetchQuotes() {
    // The quote API needs the guest CSRF and session cookies that the public page sets.
    const page = await request("https://www.xoom.com/bangladesh/send-money");
    const cookies = page.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .filter((c) => c.startsWith("CSRF=") || c.startsWith("JSESSIONID="));
    if (cookies.length < 2) throw new Error("No guest session cookies");

    const res = await postJson<Remittance>(
      "https://www.xoom.com/wapi/guest-app/remittance",
      {
        variables: {
          sourceCurrency: "GBP",
          destinationCountry: "BD",
          destinationCurrency: "BDT",
          amount: String(AMOUNT),
          target: "SEND_AMOUNT",
        },
      },
      { headers: { Cookie: cookies.join("; ") } },
    );
    // One entry per pay-in × delivery; pay-in doesn't change the price, so keep the first per delivery.
    const quotes = new Map<DeliveryMethod, Quote>();
    for (const p of res.quote.pricing) {
      const method = METHODS[p.disbursementType];
      if (!method || quotes.has(method)) continue;
      quotes.set(method, { sendAmount: AMOUNT, rate: num(p.fxRate.rate), fee: num(p.feeAmount.rawValue), method });
    }
    return [...quotes.values()];
  },
};
