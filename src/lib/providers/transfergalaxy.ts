import { COUNTRIES, type Corridor } from "../corridors";
import { formatMoney } from "../format";
import type { DeliveryMethod, Quote } from "../types";
import { num, request } from "./http";
import { routeFor, urlsFrom, type Routes } from "./routes";
import type { ProviderDef } from "./types";

const BASE = "https://transfergalaxy.com";
const SURFACE = `${BASE}/umbraco/Surface/RemittanceSurface`;

// Payout services per destination, as the destination page's form lists them.
const DESTINATIONS: Record<string, { slug: string; alpha3: string; services: [string, DeliveryMethod][] }> = {
  PKR: { slug: "pakistan", alpha3: "PAK", services: [["BNK", "bank"], ["CSH", "cash"]] },
  BDT: { slug: "bangladesh", alpha3: "BGD", services: [["BNK", "bank"], ["MMT", "wallet"], ["CSH", "cash"]] },
};

const page = (_country: string, corridor: Pick<Corridor, "to">) => `${BASE}/en/destination/${DESTINATIONS[corridor.to].slug}/`;

// Transfer Galaxy sends from the UK and the EU (not the US; its Canadian calculator doesn't serve these yet).
const EURO = ["IT", "ES", "FR", "DE", "PT", "IE"] as const;
const ROUTES: Routes = {
  "GBP-BDT": { url: page },
  "EUR-BDT": { url: page, countries: EURO },
  "GBP-PKR": { url: page },
  "EUR-PKR": { url: page, countries: EURO },
};

/** The destination page's quote form: its anti-forgery token (issued to every visitor) and hidden fields. */
export function parseTransferGalaxyForm(html: string): Record<string, string> {
  const start = html.indexOf('id="aocForm"');
  if (start < 0) throw new Error("No quote form on Transfer Galaxy's page");
  const form = html.slice(start, html.indexOf("</form>", start));
  const fields: Record<string, string> = {};
  for (const input of form.match(/<input[^>]*type="hidden"[^>]*>/g) ?? []) {
    const name = input.match(/name="([^"]+)"/)?.[1];
    if (name && !(name in fields)) fields[name] = input.match(/value="([^"]*)"/)?.[1] ?? "";
  }
  return fields;
}

/**
 * Reads the quote fragment. With a new-customer offer on, the standard rate and fee are struck
 * through (<s>) beside the offer; otherwise there's one of each.
 */
export function parseTransferGalaxyQuote(html: string, corridor: Pick<Corridor, "from" | "to">) {
  // The site HTML-encodes the apostrophe ("doesn&#39;t").
  if (/doesn(?:'|&#39;|&#x27;)t support transaction/i.test(html)) throw new Error("Not offered for this corridor");
  const cell = (label: string) => html.match(new RegExp(`<th>${label}</th>\\s*<td>([\\s\\S]*?)</td>`))?.[1] ?? "";
  const rateCell = cell("Exchange rate");
  const rates = [...rateCell.matchAll(/1 ([A-Z]{3}) = ([\d.,]+) ([A-Z]{3})/g)];
  if (rates.length === 0) throw new Error("No rate in Transfer Galaxy's quote");
  for (const m of rates) {
    if (m[1] !== corridor.from || m[3] !== corridor.to) throw new Error(`Quote is ${m[1]}→${m[3]}, not ${corridor.from}→${corridor.to}`);
  }
  const fees = [...cell("Our fee").matchAll(/([\d.,]+) ([A-Z]{3})/g)];
  if (fees.length === 0) throw new Error("No fee in Transfer Galaxy's quote");
  const offer = /<s>/.test(rateCell);
  return {
    rate: num(rates[0][2]),
    fee: num(fees[0][1]),
    offer: offer ? { rate: num(rates.at(-1)![2]), fee: num(fees.at(-1)![1]) } : undefined,
  };
}

export const transfergalaxy: ProviderDef = {
  id: "transfergalaxy",
  name: "Transfer Galaxy",
  urlFor: urlsFrom(ROUTES),
  domain: "transfergalaxy.com",
  async fetchQuotes(corridor) {
    routeFor(ROUTES, corridor);
    const dest = DESTINATIONS[corridor.to];
    const url = page("", corridor);

    // The sending country lives in the site's session, so each check gets its own cookies.
    const jar = new Map<string, string>();
    const call = async (target: string, init: RequestInit = {}) => {
      const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
      const res = await request(target, { ...init, headers: { ...init.headers, ...(cookie ? { Cookie: cookie } : {}) } });
      for (const c of res.headers.getSetCookie()) {
        const pair = c.split(";")[0];
        const eq = pair.indexOf("=");
        if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1));
      }
      return res;
    };
    const ajax = { "X-Requested-With": "XMLHttpRequest" };

    // SetSession works without visiting a page first: it answers with the sending-country cookie.
    await call(`${SURFACE}/SetSession`, {
      method: "POST",
      headers: { ...ajax, "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ countryAlpha3: COUNTRIES[corridor.sendCountry].iso3 }),
    });
    const form = parseTransferGalaxyForm(await (await call(url)).text());
    if (form.SendingCurrency !== corridor.from) throw new Error(`Session is for ${form.SendingCurrency || "no currency"}`);

    const quotes: Quote[] = [];
    let bank100: ReturnType<typeof parseTransferGalaxyQuote> | undefined;
    for (const [service, method] of dest.services) {
      try {
        const networks = (await (await call(`${SURFACE}/GetNetworksWithCurrencyJson?alpha3=${dest.alpha3}&serviceCode=${service}`, { headers: ajax })).json()) as {
          networks?: { RemittanceNetworkId: number }[];
        };
        const network = networks.networks?.[0]?.RemittanceNetworkId;
        if (network === undefined) {
          // Without a bank quote neither the regular price nor the offer's reach is known.
          if (method === "bank") throw new Error("No bank payout network");
          continue;
        }
        // Bank gets two amounts (which also shows how far the new-customer rate reaches); the rest one.
        for (const amount of method === "bank" ? [100, 1000] : [1000]) {
          const res = await call(`${SURFACE}/InternalAoc`, {
            method: "POST",
            headers: { ...ajax, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              __RequestVerificationToken: form.__RequestVerificationToken ?? "",
              SendingCurrency: corridor.from,
              ReceivingCurrency: corridor.to,
              ReceivingCountryCode: form.ReceivingCountryCode ?? "",
              CurrentPageId: form.CurrentPageId ?? "",
              ReceiverCity: "",
              cultureInfo: "en-US",
              SendingCountryAlpha3: COUNTRIES[corridor.sendCountry].iso3,
              ReceivingCountryAlpha3: dest.alpha3,
              ServiceCode: service,
              RemittanceNetworkId: String(network),
              SendingAmount: String(amount),
              ReceivingAmount: "",
            }).toString(),
          });
          const quote = parseTransferGalaxyQuote(await res.text(), corridor);
          if (method === "bank" && amount === 100) bank100 = quote;
          quotes.push({ sendAmount: amount, rate: quote.rate, fee: quote.fee, method, promo: quote.offer });
        }
      } catch (err) {
        if (method === "bank") throw err;
      }
    }

    // The offer covers only the first part of a first transfer, so above that cap the quoted offer rate
    // is a blend. Bank's two amounts give the cap (500 today): at 100 the offer rate is the full one.
    const bank1000 = quotes.find((q) => q.method === "bank" && q.sendAmount === 1000);
    const full = bank100?.offer?.rate;
    const cap =
      full && bank1000?.promo?.rate && full > bank1000.rate
        ? Math.round((1000 * (bank1000.promo.rate - bank1000.rate)) / (full - bank1000.rate) / 10) * 10
        : undefined;
    if (!cap || cap <= 0 || cap >= 1000) {
      // An offer whose reach can't be worked out isn't priced at all, rather than priced wrong.
      for (const q of quotes) delete q.promo;
      return quotes;
    }
    for (const q of quotes) {
      if (!q.promo?.rate) continue;
      // Each quote's own full offer rate: as quoted up to the cap, or unblended above it.
      const offerRate = q.sendAmount <= cap ? q.promo.rate : q.rate + ((q.promo.rate - q.rate) * q.sendAmount) / cap;
      q.promo = { ...q.promo, rate: Math.round(offerRate * 10_000) / 10_000, upTo: cap };
    }
    const offerFee = bank100?.offer?.fee;
    const note = `New customers: ${full!.toFixed(2)} on the first ${formatMoney(cap, corridor.from)}${offerFee === 0 ? " with no fee" : ""}`;
    return { quotes, note };
  },
};
