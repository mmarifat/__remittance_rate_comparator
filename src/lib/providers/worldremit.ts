import { destinationOf, type Corridor } from "../corridors";
import type { DeliveryMethod } from "../types";
import { atTiers, num, postJson } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";

const GRAPHQL = "https://api.worldremit.com/graphql";
const HEADERS = { "X-WR-Platform": "Web" };

interface PayOutMethods {
  payOutMethods: { code: string; correspondents: { id: string; name: string }[] }[];
}

interface Calculation {
  createCalculation: {
    calculation: {
      informativeSummary: { fee: { value: { amount: number }; crossedOutValue: { amount: number } | null } };
      /** `crossedOutValue` is the regular rate, shown struck through when a new-customer rate applies. */
      exchangeRate: { value: number; crossedOutValue: number | null };
    } | null;
    errors: { message?: string }[];
  };
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await postJson<{ data: T | null; errors?: { message: string }[] }>(
    GRAPHQL,
    { query, variables },
    { headers: HEADERS },
  );
  if (!res.data) throw new Error(res.errors?.[0]?.message ?? "Empty GraphQL response");
  return res.data;
}

const CALCULATION = `mutation createCalculation($amount: BigDecimal!, $sendCountry: CountryCode!, $sendCurrency: CurrencyCode!, $receiveCountry: CountryCode!, $receiveCurrency: CurrencyCode!, $payOutMethodCode: String, $correspondentId: String) {
  createCalculation(calculationInput: {amount: $amount, type: SEND, send: {country: $sendCountry, currency: $sendCurrency}, receive: {country: $receiveCountry, currency: $receiveCurrency}, payOutMethodCode: $payOutMethodCode, correspondentId: $correspondentId}) {
    calculation { informativeSummary { fee { value { amount } crossedOutValue { amount } } } exchangeRate { value crossedOutValue } }
    errors { ... on ValidationCalculationError { message } ... on GenericCalculationError { message } }
  }
}`;

// Its other payout codes (airtime, debit card deposit) aren't ones this comparison covers.
const METHODS: Record<string, DeliveryMethod> = { BNK: "bank", MOB: "wallet", CSH: "cash" };

const url = (locale: string) => (_country: string, corridor: Corridor) =>
  `https://www.worldremit.com/${locale}/${destinationOf(corridor).slug}`;
const ROUTES: Routes = {
  "GBP-BDT": { url: url("en-gb") },
  "EUR-BDT": { url: url("en") },
  "USD-BDT": { url: url("en-us") },
  "CAD-BDT": { url: url("en-ca") },
  "GBP-PKR": { url: url("en-gb") },
  "EUR-PKR": { url: url("en") },
  "USD-PKR": { url: url("en-us") },
  "CAD-PKR": { url: url("en-ca") },
};

export const worldremit: ProviderDef = {
  id: "worldremit",
  name: "WorldRemit",
  urlFor: urlsFrom(ROUTES),
  domain: "worldremit.com",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
    const receive = { receiveCountry: destinationOf(corridor).country, receiveCurrency: corridor.to };
    // Payouts differ by destination (only bKash to Bangladesh; banks, Easypaisa and cash to Pakistan),
    // and correspondent ids can change, so look them up.
    const { payOutMethods } = await gql<PayOutMethods>(
      "query($sendCountry: CountryCode!, $receiveCountry: CountryCode!, $receiveCurrency: CurrencyCode!) { payOutMethods(payOutMethodsInput: {sendCountry: $sendCountry, receiveCountry: $receiveCountry, receiveCurrency: $receiveCurrency}) { code correspondents { id name } } }",
      { sendCountry: corridor.sendCountry, ...receive },
    );
    const payouts = payOutMethods.flatMap((m) => {
      const method = METHODS[m.code];
      const correspondent = m.correspondents[0];
      return method && correspondent ? [{ code: m.code, correspondentId: correspondent.id, method }] : [];
    });
    if (payouts.length === 0) throw new Error("No payout method");

    return atTiers(async (amount) => {
      const quotes = [];
      for (const { code, correspondentId, method } of payouts) {
        const res = await gql<Calculation>(CALCULATION, {
          amount,
          sendCountry: corridor.sendCountry,
          sendCurrency: corridor.from,
          ...receive,
          payOutMethodCode: code,
          correspondentId,
        });
        const { calculation, errors } = res.createCalculation;
        if (!calculation) throw new Error(errors[0]?.message ?? "No calculation");
        const { exchangeRate, informativeSummary } = calculation;
        const rate = num(exchangeRate.crossedOutValue ?? exchangeRate.value);
        const fee = num(informativeSummary.fee.crossedOutValue?.amount ?? informativeSummary.fee.value.amount);
        const promoRate = num(exchangeRate.value);
        const promoFee = num(informativeSummary.fee.value.amount);
        quotes.push({
          sendAmount: amount,
          rate,
          fee,
          method,
          promo: promoRate > rate || promoFee < fee ? { rate: promoRate, fee: promoFee } : undefined,
        });
      }
      return quotes;
    }, payouts.length > 1 ? [100, 1000] : undefined);
  },
};
