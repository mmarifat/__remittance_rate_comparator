import type { Metadata } from "next";
import {
  COUNTRIES,
  CORRIDORS,
  DESTINATIONS,
  findCorridor,
  inCountry,
  type Corridor,
  type CountryCode,
  type ReceiveCurrency,
} from "./corridors";
import { corridorHeadline, place, shortName } from "./headline";
import { providers } from "./providers";
import { SITE_DESCRIPTION, SITE_NAME } from "./site";
import { supports } from "./snapshot";

/*
 * Titles, descriptions, canonical addresses and share cards for a link, worked out only from what the
 * link names. The visitor's location plays no part: link-preview crawlers and search bots fetch from
 * their own countries, so a bare "/" keeps the generic Bangladesh-and-Pakistan wording. Nothing here
 * asks providers for rates; service counts come from the provider registry, as on the page.
 */

type Params = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/** Everything a link's page and share card say about it. */
export interface LinkSeo {
  /** The page's <title>, ending in the site name where the link names a corridor. */
  title: string;
  /** What previews show next to the site name (og:title, twitter:title). */
  headline: string;
  description: string;
  keywords: string[];
  /** Path and query of the page's canonical address, also its og:url. */
  canonical: string;
  /** Path and query of its share card. */
  image: string;
  imageAlt: string;
  /** The words on the share card: the line beside the logo and the chips along the bottom. */
  card: { line: string; chips: string[] };
}

/** What a link names: a whole corridor, only one side of one, or nothing usable. */
type Scope =
  | { kind: "corridor"; corridor: (typeof CORRIDORS)[number]; country: CountryCode }
  | { kind: "destination"; to: ReceiveCurrency }
  | { kind: "sender"; from: string }
  | { kind: "generic" };

function scopeOf(params: Params): Scope {
  const from = first(params.from)?.toUpperCase();
  const to = first(params.to)?.toUpperCase();
  const corridor = findCorridor(from, to);
  if (corridor) return { kind: "corridor", corridor, country: inCountry(corridor, first(params.country)).sendCountry };
  if (to && Object.hasOwn(DESTINATIONS, to)) return { kind: "destination", to: to as ReceiveCurrency };
  if (from && CORRIDORS.some((c) => c.from === from)) return { kind: "sender", from };
  return { kind: "generic" };
}

const SENDING_CURRENCIES = [...new Set(CORRIDORS.map((c) => c.from))];
const RECEIVING_CURRENCIES = Object.keys(DESTINATIONS) as ReceiveCurrency[];

function joinAnd(items: readonly string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Where a sending currency is sent from, in a sentence ("the eurozone") and on its own ("Eurozone"). */
function senderPlace(from: string): { inText: string; label: string } {
  const countries = CORRIDORS.find((c) => c.from === from)!.sendCountries;
  if (countries.length === 1) return { inText: place(countries[0]), label: COUNTRIES[countries[0]].name };
  if (from === "EUR") return { inText: "the eurozone", label: "Eurozone" };
  const names = countries.map((c) => COUNTRIES[c].name);
  return { inText: joinAnd(names), label: names.join(" · ") };
}

/** Each corridor as seen from every country it can be sent from. */
const everyCountry = (corridors: readonly Corridor[]) =>
  corridors.flatMap((c) => c.sendCountries.map((country) => inCountry(c, country)));

/** The providers serving any of these corridors, in the registry's order (the page's own test). */
function servicesFor(corridors: readonly Corridor[]): string[] {
  return providers.filter((p) => corridors.some((c) => supports(p, c))).map((p) => p.name);
}

const count = (n: number) => `${n} ${n === 1 ? "service" : "services"}`;

/** "Compare 23 services, including Remitly, Taptap Send, Wise and Sendwave." */
function compareSentence(services: string[]): string {
  if (services.length === 0) return "";
  const named = services.slice(0, 4);
  const names = services.length > named.length ? `including ${joinAnd(named)}` : joinAnd(named);
  return ` Compare ${count(services.length)}, ${names}.`;
}

const payoutSentence = (to: ReceiveCurrency) =>
  ` Pay out to a bank account, ${DESTINATIONS[to].walletLabel} or cash pickup.`;

/** The wallets a destination's label names: "bKash / wallet" → bKash. */
const walletKeywords = (to: ReceiveCurrency) =>
  DESTINATIONS[to].walletLabel.split(" / ").filter((w) => w !== "wallet");

const destinationKeywords = (to: ReceiveCurrency) => {
  const d = DESTINATIONS[to];
  return [
    `send money to ${d.countryName}`,
    `remittance ${d.countryName}`,
    `best ${d.currencyName.toLowerCase()} rate`,
    ...walletKeywords(to),
  ];
};

const QUALITY_CHIPS = ["Best rate first", "Fees included"];

/** The generic page names both destinations and every sending currency. */
const GENERIC_KEYWORDS = [
  "GBP to BDT",
  "EUR to BDT",
  "USD to BDT",
  "CAD to BDT",
  "GBP to PKR",
  "EUR to PKR",
  "USD to PKR",
  "CAD to PKR",
  "pound to taka",
  "dollar to taka",
  "euro to taka",
  "pound to rupee Pakistan",
  "send money to Bangladesh",
  "send money to Pakistan",
  "remittance Pakistan",
  "remittance Bangladesh",
  "UK to Bangladesh exchange rate",
  "best taka rate",
  "Remitly",
  "Wise",
  "Taptap Send",
  "SonaliPay",
  "RizRemit",
  "Western Union",
  "bKash",
  "JazzCash",
  "Easypaisa",
];

const queryOf = (entries: [string, string][]) => (entries.length ? `?${new URLSearchParams(entries)}` : "");

/** What a (possibly shared) link's metadata and share card say, from its ?from=, ?to= and ?country=. */
export function linkSeo(params: Params): LinkSeo {
  const scope = scopeOf(params);
  const allDestinations = joinAnd(RECEIVING_CURRENCIES.map((to) => DESTINATIONS[to].countryName));

  if (scope.kind === "corridor") {
    const { corridor, country } = scope;
    const d = DESTINATIONS[corridor.to];
    const services = servicesFor([inCountry(corridor, country)]);
    const pair = `${corridor.from} to ${corridor.to}`;
    const headline = corridorHeadline(corridor, country);
    const shortCountry = shortName(country);
    // The country is only named when it isn't the corridor's default, so each page has one address.
    const entries: [string, string][] = [["from", corridor.from], ["to", corridor.to]];
    if (country !== corridor.sendCountry) entries.push(["country", country]);
    const query = queryOf(entries);
    return {
      title: `${headline} | ${SITE_NAME}`,
      headline,
      description:
        `Live ${pair} rates for sending money from ${place(country)} to ${d.countryName}, best rate first, fees included.` +
        compareSentence(services) +
        payoutSentence(corridor.to),
      keywords: [
        pair,
        `${corridor.currencyName.toLowerCase()} to ${d.currencyName.toLowerCase()}`,
        `send money from ${shortCountry} to ${d.countryName}`,
        `${shortCountry} to ${d.countryName} exchange rate`,
        ...destinationKeywords(corridor.to),
        ...services.slice(0, 4),
      ],
      canonical: `/${query}`,
      image: `/og${query}`,
      imageAlt: `${SITE_NAME}: live ${pair} rates from ${place(country)} to ${d.countryName}, best rate first, fees included`,
      card: {
        line: `${corridor.from} → ${corridor.to} · ${COUNTRIES[country].name} → ${d.countryName}`,
        chips: [...QUALITY_CHIPS, count(services.length)],
      },
    };
  }

  if (scope.kind === "destination") {
    const { to } = scope;
    const d = DESTINATIONS[to];
    const corridors = CORRIDORS.filter((c) => c.to === to);
    const services = servicesFor(everyCountry(corridors));
    const senders = corridors.map((c) => c.from);
    const places = joinAnd([...new Set(senders)].map((from) => senderPlace(from).inText));
    const headline = `Send money to ${d.countryName}: live ${joinAnd(senders)} to ${to} rates`;
    const query = queryOf([["to", to]]);
    return {
      title: `${headline} | ${SITE_NAME}`,
      headline,
      description:
        `Live money transfer rates to ${d.countryName} from ${places}, best rate first, fees included.` +
        compareSentence(services) +
        payoutSentence(to),
      keywords: [...senders.map((from) => `${from} to ${to}`), ...destinationKeywords(to), ...services.slice(0, 4)],
      canonical: `/${query}`,
      image: `/og${query}`,
      imageAlt: `${SITE_NAME}: live money transfer rates to ${d.countryName} from ${places}, best rate first`,
      card: {
        line: `${senders.join(" · ")} → ${to} · ${d.countryName}`,
        chips: [...QUALITY_CHIPS, count(services.length)],
      },
    };
  }

  if (scope.kind === "sender") {
    const { from } = scope;
    const corridors = CORRIDORS.filter((c) => c.from === from);
    const services = servicesFor(everyCountry(corridors));
    const receivers = corridors.map((c) => c.to);
    const destinations = joinAnd(receivers.map((to) => DESTINATIONS[to].countryName));
    const where = senderPlace(from);
    const headline = `Send money from ${where.inText}: live ${from} to ${joinAnd(receivers)} rates`;
    const query = queryOf([["from", from]]);
    return {
      title: `${headline} | ${SITE_NAME}`,
      headline,
      description:
        `Live ${from} money transfer rates from ${where.inText} to ${destinations}, best rate first, fees included.` +
        compareSentence(services),
      keywords: [
        ...corridors.map((c) => `${c.from} to ${c.to}`),
        ...corridors.map((c) => `${c.currencyName.toLowerCase()} to ${DESTINATIONS[c.to].currencyName.toLowerCase()}`),
        ...receivers.flatMap(destinationKeywords),
        ...services.slice(0, 4),
      ],
      canonical: `/${query}`,
      image: `/og${query}`,
      imageAlt: `${SITE_NAME}: live ${from} money transfer rates from ${where.inText} to ${destinations}, best rate first`,
      card: {
        line: `${from} → ${receivers.join(" · ")} · ${where.label}`,
        chips: [...QUALITY_CHIPS, count(services.length)],
      },
    };
  }

  const headline = `${SITE_NAME}: live money transfer rates to ${allDestinations}`;
  return {
    title: headline,
    headline,
    description: SITE_DESCRIPTION,
    keywords: GENERIC_KEYWORDS,
    canonical: "/",
    image: "/og",
    imageAlt: `${headline}, best rate first`,
    card: {
      line: `${SENDING_CURRENCIES.join(" · ")} → ${RECEIVING_CURRENCIES.join(" · ")}`,
      chips: [...QUALITY_CHIPS, `${SENDING_CURRENCIES.length} currencies`],
    },
  };
}

/** The page metadata for a link. metadataBase (set in the root layout) makes these paths absolute. */
export function linkMetadata(params: Params): Metadata {
  const seo = linkSeo(params);
  const image = { url: seo.image, ...OG_IMAGE_SIZE, alt: seo.imageAlt, type: "image/png" };
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: seo.canonical },
    openGraph: {
      type: "website",
      url: seo.canonical,
      siteName: SITE_NAME,
      title: seo.headline,
      description: seo.description,
      locale: "en_GB",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.headline,
      description: seo.description,
      images: [image],
    },
  };
}

/**
 * The corridor and sending country a link's title names, keyed "EUR-BDT:IT", or null when it names no
 * single corridor. The page can start elsewhere (a Spanish visitor on /?from=EUR&to=BDT starts on Spain).
 */
export function titledCorridor(params: Params): string | null {
  const scope = scopeOf(params);
  return scope.kind === "corridor" ? `${scope.corridor.id}:${scope.country}` : null;
}

/** The canonical address of every corridor from each of its sending countries, for the sitemap. */
export function corridorPages(): string[] {
  return everyCountry(CORRIDORS).map((c) => linkSeo({ from: c.from, to: c.to, country: c.sendCountry }).canonical);
}
