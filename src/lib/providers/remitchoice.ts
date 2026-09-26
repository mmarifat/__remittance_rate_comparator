import { num, request } from "./http";
import type { ProviderDef } from "./types";
import type { DeliveryMethod, Quote } from "../types";

const METHODS: [string, DeliveryMethod][] = [
  ["Bank", "bank"],
  ["Wallet", "wallet"],
  ["Cash", "cash"],
];
const AMOUNT = 1000;

export const remitchoice: ProviderDef = {
  id: "remitchoice",
  name: "RemitChoice",
  url: "https://www.remitchoice.com/fee-free-send-money-to/bangladesh",
  domain: "remitchoice.com",
  async fetchQuotes() {
    const quotes: Quote[] = [];
    for (const [payout, method] of METHODS) {
      // Returns an HTML fragment of the calculator.
      const res = await request("https://www.remitchoice.com/ajaxcalculator.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          sending_country: "GBR",
          receiving_country: "BGD",
          sendingcurrencycode: "GBP",
          receivingcurrencycode: "BDT",
          payout_method: payout,
          payout_patner: payout,
          sending_amount: String(AMOUNT),
          receiving_amount: "",
          total_payable_amount: "",
          action: "sending",
        }).toString(),
      });
      const html = await res.text();
      const rate = html.match(/Exchange Rate 1 GBP = ([\d.]+) BDT/)?.[1];
      const fee = html.match(/Transfer Fee: ([\d.]+) GBP/)?.[1];
      if (rate && fee) quotes.push({ sendAmount: AMOUNT, rate: num(rate), fee: num(fee), method });
    }
    return quotes;
  },
};
