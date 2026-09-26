import { num, postJson, request } from "./http";
import type { ProviderDef } from "./types";
import type { DeliveryMethod, Quote } from "../types";

const BASE = "https://public.riamoneytransfer.com";
// Without IsoCode the send country comes from IP geolocation, so a US server would get USD quotes.
const HEADERS = { IsoCode: "GB", CultureCode: "en-GB" };
const AMOUNT = 1000;

const METHODS: [string, DeliveryMethod][] = [
  ["BankDeposit", "bank"],
  ["MobilePayment", "wallet"],
  ["OfficePickup", "cash"],
];

interface Calculation {
  model: { transferDetails: { calculations: { exchangeRate: number; transferFee: number; exchangeRatePromo?: number } } };
}

export const ria: ProviderDef = {
  id: "ria",
  name: "Ria",
  url: "https://www.riamoneytransfer.com/en-gb/send-money-to-bangladesh/",
  domain: "riamoneytransfer.com",
  async fetchQuotes() {
    // Anonymous guest session; the token comes back in a response header.
    const session = await request(`${BASE}/Authorization/session`, { headers: HEADERS });
    const token = session.headers.get("bearer");
    if (!token) throw new Error("No session token");

    const quotes: Quote[] = [];
    let promoRate = 0;
    for (const [deliveryMethod, method] of METHODS) {
      try {
        const res = await postJson<Calculation>(
          `${BASE}/MoneyTransferCalculator/Calculate`,
          {
            selections: {
              countryFrom: "GB",
              countryTo: "BD",
              amountFrom: AMOUNT,
              currencyFrom: "GBP",
              currencyTo: "BDT",
              paymentMethod: "DebitCard",
              deliveryMethod,
            },
          },
          { headers: { ...HEADERS, Authorization: `Bearer ${token}` } },
        );
        const c = res.model.transferDetails.calculations;
        quotes.push({ sendAmount: AMOUNT, rate: num(c.exchangeRate), fee: num(c.transferFee), method });
        if (method === "bank" && c.exchangeRatePromo) promoRate = num(c.exchangeRatePromo);
      } catch (err) {
        if (method === "bank") throw err;
      }
    }
    const bank = quotes.find((q) => q.method === "bank");
    const note = bank && promoRate > bank.rate ? `First transfer: ${promoRate.toFixed(2)}` : undefined;
    return { quotes, note };
  },
};
