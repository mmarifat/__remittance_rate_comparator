import { atTiers, getJson, getText, num } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";

interface PangeaCalculation {
  StandardRate: { Rate: string };
  PromotionalRate?: { Rate: string | null };
}

const PAGE = "https://www.pangeamoneytransfer.com/country/bangladesh";

// US senders only.
const ROUTES: Routes = { "USD-BDT": { url: PAGE } };

/** Pangea's calculator API gives the rate but not the fee, which its Bangladesh page lists per delivery method. */
export function parsePangeaFees(html: string): { bank: number; cash: number } {
  const fee = (label: string) => html.match(new RegExp(`${label}:</strong>\\s*\\$([\\d.]+)`))?.[1];
  const bank = fee("Bank Deposit");
  const cash = fee("Cash Pickup");
  if (!bank || !cash) throw new Error("Fees not found on Pangea's Bangladesh page");
  return { bank: num(bank), cash: num(cash) };
}

export const pangea: ProviderDef = {
  id: "pangea",
  name: "Pangea",
  urlFor: urlsFrom(ROUTES),
  domain: "pangeamoneytransfer.com",
  note: "New customers: first transfer has no fee",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
    const fees = parsePangeaFees(await getText(PAGE));
    return atTiers(async (amount) => {
      const res = await getJson<PangeaCalculation>(
        `https://api.gopangea.com/api/v1/marketing/fx-calc/calculate?country=bd&amount=${amount}&inputType=send`,
      );
      const rate = num(res.StandardRate.Rate);
      // Pangea waives the fee on a first transfer.
      const promo = { fee: 0 };
      return [
        { sendAmount: amount, rate, fee: fees.bank, method: "bank" as const, promo },
        { sendAmount: amount, rate, fee: fees.cash, method: "cash" as const, promo },
      ];
    }, [100, 1000]);
  },
};
