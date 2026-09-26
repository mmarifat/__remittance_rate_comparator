import { atTiers, num, postJson } from "./http";
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

const CALCULATION = `mutation createCalculation($amount: BigDecimal!, $payOutMethodCode: String, $correspondentId: String) {
  createCalculation(calculationInput: {amount: $amount, type: SEND, send: {country: "GB", currency: "GBP"}, receive: {country: "BD", currency: "BDT"}, payOutMethodCode: $payOutMethodCode, correspondentId: $correspondentId}) {
    calculation { informativeSummary { fee { value { amount } } } exchangeRate { value } }
    errors { ... on ValidationCalculationError { message } ... on GenericCalculationError { message } }
  }
}`;

export const worldremit: ProviderDef = {
  id: "worldremit",
  name: "WorldRemit",
  url: "https://www.worldremit.com/en-gb/bangladesh",
  domain: "worldremit.com",
  async fetchQuotes() {
    // For GB→BD WorldRemit only pays out to mobile wallets (bKash). Correspondent ids can change, so look them up.
    const methods = await gql<PayOutMethods>(
      '{ payOutMethods(payOutMethodsInput: {sendCountry: "GB", receiveCountry: "BD", receiveCurrency: "BDT"}) { code correspondents { id name } } }',
    );
    const correspondent = methods.payOutMethods.find((m) => m.code === "MOB")?.correspondents[0];
    if (!correspondent) throw new Error("No mobile wallet payout");

    return atTiers(async (amount) => {
      const res = await gql<Calculation>(CALCULATION, {
        amount,
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
