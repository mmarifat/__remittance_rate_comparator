import { destinationOf, type Corridor } from "../corridors";
import type { DeliveryMethod, Quote } from "../types";
import { atTiers, getJson, num, request } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";

// Several Bangladeshi banks' UK exchange houses run their online portal on RemitONE, which has a public
// "check rates" form on its login page: pick the countries and payout, and it prints the rate and
// charges before you sign in. That form is what these providers read.

const PAYOUTS: [string, DeliveryMethod][] = [
  ["Account", "bank"],
  ["Mobile Transfer", "wallet"],
  ["Cash Collection", "cash"],
];

/**
 * Reads a RemitONE price page: "Send Money From United Kingdom to Bangladesh (Account) … GBP 1,000.00
 * Send Amount 168.000000 Rate BDT 168,000.00 Receive Amount GBP 10.00 Total Charges".
 */
export function parseRemitOnePrice(html: string, corridor: Pick<Corridor, "from" | "to">): { rate: number; fee: number } {
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
  const m = text.match(/([A-Z]{3}) [\d.,]+ Send Amount ([\d.,]+) Rate ([A-Z]{3}) [\d.,]+ Receive Amount ([A-Z]{3}) ([\d.,]+) Total Charges/);
  if (!m) throw new Error("No price on the rates page");
  if (m[1] !== corridor.from || m[3] !== corridor.to || m[4] !== corridor.from) {
    throw new Error(`Rates page priced ${m[1]}→${m[3]}, not ${corridor.from}→${corridor.to}`);
  }
  return { rate: num(m[2]), fee: num(m[5]) };
}

interface RemitOneSite {
  id: string;
  name: string;
  domain: string;
  /** The exchange house's own site, where users start. */
  homepage: string;
  /** The portal's base URL, e.g. https://online.ificuk.co.uk */
  portal: string;
  /** The portal's id for the UK, from its "From Country" list. */
  ukCountryId: string;
  /** Amounts to price: more where fees step up with the amount. */
  tiers: number[];
}

/** A UK–Bangladesh exchange house whose RemitONE portal has the public rates form. */
export function remitOneProvider(site: RemitOneSite): ProviderDef {
  const ROUTES: Routes = { "GBP-BDT": { url: site.homepage } };
  return {
    id: site.id,
    name: site.name,
    urlFor: urlsFrom(ROUTES),
    domain: site.domain,
    async fetchQuotes(corridor) {
      routeFor(ROUTES, corridor);
      // Destination ids are the portal's own, so look Bangladesh up rather than hardcoding it.
      const countries = await getJson<{ country_id: string; iso_code: string }[]>(
        `${site.portal}/prices/get_dest_countries?srcCountryID=${site.ukCountryId}`,
      );
      const { country } = destinationOf(corridor);
      const dest = countries.find((c) => c.iso_code.toUpperCase() === country)?.country_id;
      if (!dest) throw new Error(`${country} isn't a destination on the portal`);

      const quotes: Quote[] = [];
      for (const [type, method] of PAYOUTS) {
        try {
          quotes.push(
            ...(await atTiers(async (amount) => {
              const res = await request(`${site.portal}/prices/send_money`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                  srcCountryID: site.ukCountryId,
                  destCountryID: dest,
                  transferType: type,
                  amountType: "source",
                  amount: String(amount),
                }).toString(),
              });
              const { rate, fee } = parseRemitOnePrice(await res.text(), corridor);
              return { sendAmount: amount, rate, fee, method };
              // Every tier for bank payouts; 100 and 1,000 for the others, to keep requests down.
            }, method === "bank" ? site.tiers : [100, 1000])),
          );
        } catch (err) {
          // Not every house offers every payout; only a failing bank quote fails the provider.
          if (method === "bank") throw err;
        }
      }
      return quotes;
    },
  };
}

// IFIC Money Transfer (UK) Ltd, owned by IFIC Bank. No fee at any amount tried, so two amounts are enough.
export const ific = remitOneProvider({
  id: "ific",
  name: "IFIC Money Transfer",
  domain: "ificuk.co.uk",
  homepage: "https://ificuk.co.uk/",
  portal: "https://online.ificuk.co.uk",
  ukCountryId: "01",
  tiers: [100, 1000],
});

// BA Exchange Company (UK) Ltd, owned by Bank Asia. Its home page converter is a fixed indicative
// rate, so prices come from its portal's rates form instead; the fee steps up with the amount.
export const baexchange = remitOneProvider({
  id: "baexchange",
  name: "BA Exchange",
  domain: "baexchange.co.uk",
  homepage: "https://www.baexchange.co.uk/",
  portal: "https://remit.bankasia-bd.com/orm",
  ukCountryId: "02",
  tiers: [100, 500, 1000, 2500],
});
