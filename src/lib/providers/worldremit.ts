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
      informativeSummary: { fee: { value: { amount: number } } };
      exchangeRate: { value: number };
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

const CALCULATION = `mutation createCalculation($amount: BigDecimal!, $sendCountry: CountryCode!, $sendCurrency: CurrencyCode!, $payOutMethodCode: String, $correspondentId: String) {
  createCalculation(calculationInput: {amount: $amount, type: SEND, send: {country: $sendCountry, currency: $sendCurrency}, receive: {country: "BD", currency: "BDT"}, payOutMethodCode: $payOutMethodCode, correspondentId: $correspondentId}) {
    calculation { informativeSummary { fee { value { amount } } } exchangeRate { value } }
    errors { ... on ValidationCalculationError { message } ... on GenericCalculationError { message } }
  }
}`;

const ROUTES: Routes = {
  "GBP-BDT": { url: "https://www.worldremit.com/en-gb/bangladesh" },
  "EUR-BDT": { url: "https://www.worldremit.com/en/bangladesh" },
  "USD-BDT": { url: "https://www.worldremit.com/en-us/bangladesh" },
  "CAD-BDT": { url: "https://www.worldremit.com/en-ca/bangladesh" },
};

export const worldremit: ProviderDef = {
  id: "worldremit",
  name: "WorldRemit",
  urlFor: urlsFrom(ROUTES),
  domain: "worldremit.com",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
    // To Bangladesh WorldRemit only pays out to mobile wallets (bKash). Correspondent ids can change, so look them up.
    const methods = await gql<PayOutMethods>(
      "query($sendCountry: CountryCode!) { payOutMethods(payOutMethodsInput: {sendCountry: $sendCountry, receiveCountry: \"BD\", receiveCurrency: \"BDT\"}) { code correspondents { id name } } }",
      { sendCountry: corridor.sendCountry },
    );
    const correspondent = methods.payOutMethods.find((m) => m.code === "MOB")?.correspondents[0];
    if (!correspondent) throw new Error("No mobile wallet payout");

    return atTiers(async (amount) => {
      const res = await gql<Calculation>(CALCULATION, {
        amount,
        sendCountry: corridor.sendCountry,
        sendCurrency: corridor.from,
        payOutMethodCode: "MOB",
        correspondentId: correspondent.id,
      });
      const { calculation, errors } = res.createCalculation;
      if (!calculation) throw new Error(errors[0]?.message ?? "No calculation");
      return {
        sendAmount: amount,
        rate: num(calculation.exchangeRate.value),
        fee: num(calculation.informativeSummary.fee.value.amount),
        method: "wallet",
      };
    });
  },
};
