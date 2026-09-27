import { num, postJson, request } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";
import type { DeliveryMethod, Quote } from "../types";

const BASE = "https://public.riamoneytransfer.com";
const AMOUNT = 1000;

const url = (country: string) => `https://www.riamoneytransfer.com/en-${country.toLowerCase()}/send-money-to-bangladesh/`;
const ROUTES: Routes = { "GBP-BDT": { url }, "EUR-BDT": { url }, "USD-BDT": { url }, "CAD-BDT": { url } };

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
  urlFor: urlsFrom(ROUTES),
  domain: "riamoneytransfer.com",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
    // IsoCode sets the session's sending country; without it Ria geolocates the caller's IP.
    const HEADERS = { IsoCode: corridor.sendCountry, CultureCode: "en-GB" };
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
              countryFrom: corridor.sendCountry,
              countryTo: "BD",
              amountFrom: AMOUNT,
              currencyFrom: corridor.from,
              currencyTo: corridor.to,
              paymentMethod: "DebitCard",
              deliveryMethod,
            },
          },
          { headers: { ...HEADERS, Authorization: `Bearer ${token}` } },
        );
        const c = res.model.transferDetails.calculations;
        const promo = c.exchangeRatePromo && c.exchangeRatePromo > c.exchangeRate ? num(c.exchangeRatePromo) : undefined;
        quotes.push({
          sendAmount: AMOUNT,
          rate: num(c.exchangeRate),
          fee: num(c.transferFee),
          method,
          promo: promo ? { rate: promo } : undefined,
        });
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
