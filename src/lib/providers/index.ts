import { bossmoney } from "./bossmoney";
import { dahabshiil } from "./dahabshiil";
import { instarem } from "./instarem";
import { lemfi } from "./lemfi";
import { moneygram } from "./moneygram";
import { nala, withNalaFallback } from "./nala";
import { nationalexchange } from "./nationalexchange";
import { necmoney } from "./necmoney";
import { pangea } from "./pangea";
import { paysend } from "./paysend";
import { profee } from "./profee";
import { remitchoice } from "./remitchoice";
import { remitly } from "./remitly";
import { remitngo } from "./remitngo";
import { baexchange, ific } from "./remitone";
import { ria } from "./ria";
import { rizremit } from "./rizremit";
import { sendwave } from "./sendwave";
import { sonaliexchange } from "./sonaliexchange";
import { sonalipay } from "./sonalipay";
import { taptapsend } from "./taptapsend";
import { transfergalaxy } from "./transfergalaxy";
import { transfergo } from "./transfergo";
import type { ProviderDef } from "./types";
import { westernunion } from "./westernunion";
import { viaWiseComparison, withWiseFallback } from "./wiseComparison";
import { wise } from "./wise";
import { worldremit } from "./worldremit";
import { xe } from "./xe";
import { xoom } from "./xoom";
import { urlsFrom } from "./routes";

export const providers: ProviderDef[] = [
  // Global apps
  withWiseFallback(remitly, "remitly"),
  taptapsend,
  wise,
  sendwave,
  worldremit,
  withNalaFallback(transfergo, "TransferGo", 0),
  withWiseFallback(instarem, "instarem"),
  nala,
  paysend,
  profee,
  lemfi,
  transfergalaxy,
  // Established money transfer operators
  withWiseFallback(westernunion, "western-union"),
  xe,
  // MoneyGram and Xoom block datacenter requests, so Wise's copy of their price is what usually shows.
  withWiseFallback(moneygram, "moneygram"),
  ria,
  withWiseFallback(xoom, "xoom"),
  dahabshiil,
  // UK specialists
  sonalipay,
  rizremit,
  remitngo,
  necmoney,
  remitchoice,
  ific,
  baexchange,
  // US specialists
  pangea,
  bossmoney,
  sonaliexchange,
  // Italy specialists (Bangladesh and Pakistan)
  nationalexchange,
  // Only available through Wise's comparison data
  viaWiseComparison({
    id: "skrill",
    alias: "skrill",
    name: "Skrill",
    urlFor: urlsFrom({
      "GBP-BDT": { url: "https://www.skrill.com/en/transfer-money/international-money-transfers/" },
      "GBP-PKR": { url: "https://www.skrill.com/en/transfer-money/international-money-transfers/" },
    }),
    domain: "skrill.com",
  }),
  viaWiseComparison({
    id: "ofx",
    alias: "ofx",
    name: "OFX",
    // OFX has no public calculator for transfers; Wise's comparison lists its Pakistan prices.
    urlFor: urlsFrom({
      "GBP-PKR": { url: "https://www.ofx.com/en-gb/" },
      "EUR-PKR": { url: "https://www.ofx.com/en-ie/", countries: ["IT"] },
      "USD-PKR": { url: "https://www.ofx.com/en-us/" },
      "CAD-PKR": { url: "https://www.ofx.com/en-ca/" },
    }),
    domain: "ofx.com",
  }),
  viaWiseComparison({
    id: "bmo",
    alias: "bmo",
    name: "BMO",
    urlFor: urlsFrom({ "CAD-BDT": { url: "https://www.bmo.com/en-ca/main/personal/ways-to-bank/global-money-transfer/" } }),
    domain: "bmo.com",
  }),
];
