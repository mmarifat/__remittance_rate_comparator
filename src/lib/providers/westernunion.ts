import { atTiers, num, postJson } from "./http";
import type { ProviderDef } from "./types";
import type { DeliveryMethod } from "../types";

interface Catalog {
  response_status?: { code: string };
  services_groups: { service: string; pay_groups: { fx_rate: number; gross_fee: number }[] }[];
}

const SERVICES: Record<string, DeliveryMethod> = { "500": "bank", "800": "wallet", "000": "cash" };

export const westernunion: ProviderDef = {
  id: "western-union",
  name: "Western Union",
  url: "https://www.westernunion.com/gb/en/send-money-to-bangladesh.html",
  domain: "westernunion.com",
  fetchQuotes: () =>
    atTiers(async (amount) => {
      const res = await postJson<Catalog>("https://www.westernunion.com/wuconnect/prices/catalog", {
        header_request: { version: "0.5", request_type: "PRICECATALOG" },
        sender: { client: "WUCOM", channel: "WWEB", funds_in: "*", curr_iso3: "GBP", cty_iso2_ext: "GB", send_amount: String(amount) },
        receiver: { curr_iso3: "BDT", cty_iso2_ext: "BD", cty_iso2: "BD" },
      });
      if (res.response_status && res.response_status.code !== "P0000") {
        throw new Error(`Western Union status ${res.response_status.code}`);
      }
      return res.services_groups.flatMap((g) => {
        const method = SERVICES[g.service];
        const price = g.pay_groups[0];
        return method && price
          ? [{ sendAmount: amount, rate: num(price.fx_rate), fee: num(price.gross_fee), method }]
          : [];
      });
    }),
};
