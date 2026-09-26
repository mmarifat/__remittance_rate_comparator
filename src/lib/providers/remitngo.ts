import { getText, num, postForm } from "./http";
import type { ProviderDef } from "./types";
import type { DeliveryMethod, Quote } from "../types";

interface RateResponse {
  success: boolean;
  data: { rate: number; fee: number; has_promo?: boolean; standard_rate?: number; standard_fee?: number };
}

const ORDER_TYPES: [string, DeliveryMethod][] = [
  ["3", "bank"],
  ["1", "wallet"],
  ["2", "cash"],
];
const AMOUNT = 1000;

export const remitngo: ProviderDef = {
  id: "remitngo",
  name: "REMITnGO (BRAC Saajan)",
  url: "https://remitngo.com/",
  domain: "remitngo.com",
  async fetchQuotes() {
    // The calculator is a WordPress AJAX action guarded by a nonce printed on the home page.
    const home = await getText("https://remitngo.com/");
    const nonce = home.match(/var bselCalc = \{[^;]*"nonce":"([a-f0-9]+)"/)?.[1];
    if (!nonce) throw new Error("No calculator nonce");

    const quotes: Quote[] = [];
    for (const [orderType, method] of ORDER_TYPES) {
      const res = await postForm<RateResponse>("https://remitngo.com/wp-admin/admin-ajax.php", {
        action: "bsel_rc_get_rate",
        nonce,
        from_country_id: "4",
        to_country_id: "1",
        order_type_id: orderType,
        payment_mode_id: "5",
        amount: String(AMOUNT),
        calculation_type: "1",
      });
      if (!res.success) continue;
      const { data } = res;
      quotes.push({
        sendAmount: AMOUNT,
        rate: num(data.standard_rate ?? data.rate),
        fee: num(data.standard_fee ?? data.fee),
        method,
      });
    }
    return quotes;
  },
};
