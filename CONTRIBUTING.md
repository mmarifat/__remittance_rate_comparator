# Contributing

Thanks for helping people get more taka for their pounds. The most useful contributions are:

- **Fixing a broken provider.** Providers change their websites, and a provider that stops answering shows up under "Couldn't check just now". After 6 hours of failures, an issue labelled [`provider-health`](../../issues?q=label%3Aprovider-health) opens automatically; those are good first issues.
- **Adding a provider** that sends money to Bangladesh from the UK, eurozone, US or Canada.
- **Adding a corridor to a provider** that already serves it but isn't switched on here yet.
- **Improving the page**: accessibility, layout, wording.

For anything bigger, such as a new currency corridor, please open an issue first so we can agree on the approach.

## Setup

```bash
bun install
bun run dev              # http://localhost:3000
bun run test             # unit tests
bun run lint
bun run check:providers  # query every provider once and print what came back
```

## Adding or fixing a provider

Each provider is one file in `src/lib/providers/` that exports a `ProviderDef`:

```ts
import { atTiers, getJson, num } from "./http";
import { routeFor, urlsOf, type Routes } from "./routes";
import type { ProviderDef } from "./types";

// One entry per corridor this provider serves: the page users start a transfer on (a function when it
// differs by sending country), plus any request details that differ by corridor. `countries` limits a
// multi-country corridor (euros) to the countries the provider actually serves.
const ROUTES: Routes<{ product: string }> = {
  "GBP-BDT": { url: "https://example.com/gb/bangladesh", product: "uk-bd" },
  "EUR-BDT": { url: (country) => `https://example.com/${country.toLowerCase()}/bangladesh`, product: "eu-bd", countries: ["IT", "ES"] },
};

export const example: ProviderDef = {
  id: "example",
  name: "Example Remit",
  urls: urlsOf(ROUTES),
  domain: "example.com", // used to show the logo
  fetchQuotes: (corridor) => {
    const { product } = routeFor(ROUTES, corridor);
    return atTiers(async (amount) => {
      const res = await getJson<{ rate: string; fee: string }>(
        `https://example.com/api/quote?product=${product}&country=${corridor.sendCountry}&from=${corridor.from}&amount=${amount}`,
      );
      return { sendAmount: amount, rate: num(res.rate), fee: num(res.fee), method: "bank" };
    }, [100, 1000]);
  },
};
```

Then add it to the list in `src/lib/providers/index.ts` and run `bun run check:providers <corridor>` (e.g. `USD-BDT`, or `all`). A provider is only checked for the corridors in its `ROUTES`, so only add a corridor once you've seen its request return a real quote.

Things to know:

- `rate` is BDT per unit of the sending currency and `fee` is in the sending currency. `method` is `"bank"`, `"wallet"` (bKash and similar) or `"cash"`.
- `corridor` gives you `from` (e.g. `"EUR"`), `to` (`"BDT"`) and `sendCountry` (ISO alpha-2, e.g. `"ES"` when a euro sender picks Spain). `COUNTRIES` in `src/lib/corridors.ts` has each country's alpha-3 and numeric codes for APIs that want those.
- If the provider shows a first-transfer deal, attach it as `promo: { rate?, fee?, upTo? }` on the quote (see `remitly.ts`); "I'm a new customer" uses it.
- If a provider prices each way of paying separately (card, bank transfer, ...), use the cheapest non-crypto one, as `westernunion.ts` does.
- If a provider publishes its rate but not its fee, set `fee: 0, feeUnknown: true` (see `nationalexchange.ts`). The page then shows the fee as "Not listed".
- When a rate comes from a web page rather than an API, put the parsing in an exported function and add a test with a trimmed copy of the page to `src/lib/providers.test.ts`.
- Use regular pricing, not first-transfer promotions. Put a promotion in `note` instead (see `remitly.ts`).
- If the price depends on the amount, quote a few amounts with `atTiers`. If it doesn't, return one quote.
- Always use the helpers in `http.ts` (`getJson`, `postJson`, `postForm`, `getText`, `request`), never bare `fetch`. They add the `X-Open-Source-Client` header that tells providers who is asking, plus a timeout and a retry on HTTP 429.
- Rates more than 10% away from mid-market are dropped automatically, so a mistake in parsing won't show a wrong rate.

### Ground rules for providers

- Only use public, unauthenticated calculators: the same requests a provider's website makes for any visitor.
- No logins, no accounts, and no getting around CAPTCHAs, bot protection or deliberate obfuscation. If a provider blocks automated requests, leave it out.
- Keep request volume low: a handful of requests per check, not dozens.

## Pull requests

- Keep each pull request to one provider or one change.
- Make sure `bun run lint` and `bun run test` pass. CI runs both on every pull request.
- For provider changes, paste that provider's line from `bun run check:providers` into the description.
