import { atTiers, num, postJson } from "./http";
import { routeFor, urlsOf, type Routes } from "./routes";
import type { ProviderDef } from "./types";
import type { DeliveryMethod } from "../types";

interface Catalog {
  response_status?: { code: string };
  services_groups: { service: string; pay_groups: { fund_in: string; fx_rate: number; gross_fee: number }[] }[];
}

const SERVICES: Record<string, DeliveryMethod> = { "500": "bank", "800": "wallet", "000": "cash" };

const ROUTES: Routes = {
  "GBP-BDT": { url: "https://www.westernunion.com/gb/en/send-money-to-bangladesh.html" },
  "EUR-BDT": { url: "https://www.westernunion.com/it/en/send-money-to-bangladesh.html" },
  "USD-BDT": { url: "https://www.westernunion.com/us/en/send-money-to-bangladesh.html" },
  "CAD-BDT": { url: "https://www.westernunion.com/ca/en/send-money-to-bangladesh.html" },
};

export const westernunion: ProviderDef = {
  id: "western-union",
  name: "Western Union",
  urls: urlsOf(ROUTES),
  domain: "westernunion.com",
  fetchQuotes: (corridor) => {
    routeFor(ROUTES, corridor);
    return atTiers(async (amount) => {
      const res = await postJson<Catalog>("https://www.westernunion.com/wuconnect/prices/catalog", {
        header_request: { version: "0.5", request_type: "PRICECATALOG" },
        sender: {
          client: "WUCOM",
          channel: "WWEB",
          funds_in: "*",
          curr_iso3: corridor.from,
          cty_iso2_ext: corridor.sendCountry,
          send_amount: String(amount),
        },
        receiver: { curr_iso3: corridor.to, cty_iso2_ext: "BD", cty_iso2: "BD" },
      });
      if (res.response_status && res.response_status.code !== "P0000") {
        throw new Error(`Western Union status ${res.response_status.code}`);
      }
      return res.services_groups.flatMap((g) => {
        const method = SERVICES[g.service];
        // One price per way of paying (card, bank account, ...); in the US a credit card costs $34.99
        // against $0.99 by bank, so use the cheapest.
        const price = g.pay_groups.reduce<(typeof g.pay_groups)[number] | undefined>(
          (best, p) => (!best || p.gross_fee < best.gross_fee ? p : best),
          undefined,
        );
        return method && price
          ? [{ sendAmount: amount, rate: num(price.fx_rate), fee: num(price.gross_fee), method }]
          : [];
      });
    });
  },
};
