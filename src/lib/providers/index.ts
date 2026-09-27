import { instarem } from "./instarem";
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
import { ria } from "./ria";
import { rizremit } from "./rizremit";
import { sendwave } from "./sendwave";
import { sonaliexchange } from "./sonaliexchange";
import { sonalipay } from "./sonalipay";
import { taptapsend } from "./taptapsend";
import { transfergo } from "./transfergo";
import type { ProviderDef } from "./types";
import { westernunion } from "./westernunion";
import { viaWiseComparison, withWiseFallback } from "./wiseComparison";
import { wise } from "./wise";
import { worldremit } from "./worldremit";
import { xe } from "./xe";
import { xoom } from "./xoom";

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
  // Established money transfer operators
  withWiseFallback(westernunion, "western-union"),
  xe,
  moneygram,
  ria,
  xoom,
  // UK–Bangladesh specialists
  sonalipay,
  rizremit,
  remitngo,
  necmoney,
  remitchoice,
  // US specialists
  pangea,
  sonaliexchange,
  // Italy specialists
  nationalexchange,
  // Only available through Wise's comparison data
  viaWiseComparison({
    id: "skrill",
    alias: "skrill",
    name: "Skrill",
    urls: { "GBP-BDT": "https://www.skrill.com/en/money-transfer/send-money-to-bangladesh/" },
    domain: "skrill.com",
  }),
  viaWiseComparison({
    id: "bmo",
    alias: "bmo",
    name: "BMO",
    urls: { "CAD-BDT": "https://www.bmo.com/main/personal/bank-accounts/" },
    domain: "bmo.com",
  }),
];
