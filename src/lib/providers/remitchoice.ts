import { destinationOf, type Corridor } from "../corridors";
import { num, request } from "./http";
import type { ProviderDef } from "./types";
import type { DeliveryMethod, Quote } from "../types";
import { urlsFrom } from "./routes";

const METHODS: [string, DeliveryMethod][] = [
  ["Bank", "bank"],
  ["Wallet", "wallet"],
  ["Cash", "cash"],
];
const AMOUNT = 1000;

const page = (_country: string, corridor: Corridor) =>
  `https://www.remitchoice.com/fee-free-send-money-to/${destinationOf(corridor).slug}`;

export const remitchoice: ProviderDef = {
  id: "remitchoice",
  name: "RemitChoice",
  urlFor: urlsFrom({ "GBP-BDT": { url: page }, "GBP-PKR": { url: page } }),
  domain: "remitchoice.com",
  async fetchQuotes(corridor) {
    const quotes: Quote[] = [];
    for (const [payout, method] of METHODS) {
      // Returns an HTML fragment of the calculator.
      const res = await request("https://www.remitchoice.com/ajaxcalculator.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          sending_country: "GBR",
          receiving_country: destinationOf(corridor).iso3,
          sendingcurrencycode: "GBP",
          receivingcurrencycode: corridor.to,
          payout_method: payout,
          payout_patner: payout,
          sending_amount: String(AMOUNT),
          receiving_amount: "",
          total_payable_amount: "",
          action: "sending",
        }).toString(),
      });
      const html = await res.text();
      const rate = html.match(new RegExp(`Exchange Rate 1 GBP = ([\\d.]+) ${corridor.to}`))?.[1];
      const fee = html.match(/Transfer Fee: ([\d.]+) GBP/)?.[1];
      if (rate && fee) quotes.push({ sendAmount: AMOUNT, rate: num(rate), fee: num(fee), method });
    }
    return quotes;
  },
};
