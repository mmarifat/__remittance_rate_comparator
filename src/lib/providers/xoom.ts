import { num, postJson, request } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";
import type { DeliveryMethod, Quote } from "../types";

interface Remittance {
  quote: {
    pricing: {
      disbursementType: string;
      paymentType?: { type: string };
      fxRate: { rate: string };
      feeAmount: { rawValue: string };
    }[];
  };
}

const METHODS: Record<string, DeliveryMethod> = { DEPOSIT: "bank", MOBILE_WALLET: "wallet", PICKUP: "cash" };
const AMOUNT = 1000;

const URL = "https://www.xoom.com/bangladesh/send-money";
const ROUTES: Routes = { "GBP-BDT": { url: URL }, "EUR-BDT": { url: URL }, "USD-BDT": { url: URL }, "CAD-BDT": { url: URL } };

export const xoom: ProviderDef = {
  id: "xoom",
  name: "Xoom",
  urlFor: urlsFrom(ROUTES),
  domain: "xoom.com",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
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
          sourceCurrency: corridor.from,
          destinationCountry: "BD",
          destinationCurrency: corridor.to,
          amount: String(AMOUNT),
          target: "SEND_AMOUNT",
        },
      },
      { headers: { Cookie: cookies.join("; ") } },
    );
    // One entry per way of paying × delivery. Cards cost more (C$21.49 vs nothing by bank in Canada),
    // so keep the cheapest per delivery, ignoring paying in crypto (PayPal's stablecoin).
    const quotes = new Map<DeliveryMethod, Quote>();
    for (const p of res.quote.pricing) {
      const method = METHODS[p.disbursementType];
      if (!method || p.paymentType?.type.startsWith("CRYPTO")) continue;
      const quote = { sendAmount: AMOUNT, rate: num(p.fxRate.rate), fee: num(p.feeAmount.rawValue), method };
      const current = quotes.get(method);
      if (!current || quote.fee < current.fee) quotes.set(method, quote);
    }
    return [...quotes.values()];
  },
};
