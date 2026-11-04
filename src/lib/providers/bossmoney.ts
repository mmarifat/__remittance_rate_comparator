import { destinationOf, type Corridor } from "../corridors";
import type { DeliveryMethod } from "../types";
import { atTiers, num, postJson } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface PromoCalculation {
  /** `sell_rate` is what's applied; `base_sell_rate`, when present, is the regular rate under a new-customer deal. */
  fx_rates: { sell_rate: string; base_sell_rate?: string };
  /** Regular fee, paying by debit card or bank (credit cards cost more). */
  pricing_fee: { fee: string };
  /** Fee actually charged with any deal applied. */
  fee?: { fee: string };
}

// BOSS Money (IDT, also behind Boss Revolution's calculator) sends from the US only.
const url = (_country: string, corridor: Corridor) => `https://www.bossmoney.com/en-us/send-money/${destinationOf(corridor).slug}`;
const ROUTES: Routes = { "USD-BDT": { url }, "USD-PKR": { url } };

// Its pages list bank and mobile wallet payouts to Bangladesh, plus cash pickup in Pakistan. The quote
// doesn't vary by payout.
const METHODS: Record<string, DeliveryMethod[]> = { BDT: ["bank", "wallet"], PKR: ["bank", "wallet", "cash"] };

export const bossmoney: ProviderDef = {
  id: "bossmoney",
  name: "BOSS Money",
  urlFor: urlsFrom(ROUTES),
  domain: "bossmoney.com",
  fetchQuotes: (corridor) => {
    routeFor(ROUTES, corridor);
    let deal: { rate: number; fee: number } | undefined;
    return atTiers(async (amount) => {
      const res = await postJson<PromoCalculation>("https://api.idtm.io/money-transfer/public/transfer/promo-calculation", {
        send_amount: amount.toFixed(2),
        amount_type: "sender",
        sender_currency_code: corridor.from,
        sender_country_code: corridor.sendCountry,
        recipient_currency_code: corridor.to,
        recipient_country_code: destinationOf(corridor).country,
      });
      const applied = num(res.fx_rates.sell_rate);
      const rate = res.fx_rates.base_sell_rate ? num(res.fx_rates.base_sell_rate) : applied;
      const fee = num(res.pricing_fee.fee);
      const dealFee = res.fee ? num(res.fee.fee) : fee;
      const promo = applied > rate || dealFee < fee ? { rate: applied, fee: dealFee } : undefined;
      deal ??= promo;
      return (METHODS[corridor.to] ?? ["bank"]).map((method) => ({ sendAmount: amount, rate, fee, method, promo }));
    }, [100, 1000, 3000]).then((quotes) => ({
      quotes,
      note: deal ? `New customers: ${deal.rate.toFixed(2)}${deal.fee === 0 ? " with no fee" : ""} on early transfers` : undefined,
    }));
  },
};
