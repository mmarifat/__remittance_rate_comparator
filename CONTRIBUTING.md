# Contributing

Thanks for helping people get more taka for their pounds. The most useful contributions are:

- **Fixing a broken provider.** Providers change their websites, and a provider that stops answering shows up under "Couldn't check just now".
- **Adding a provider** that sends money from the UK to Bangladesh.
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
import type { ProviderDef } from "./types";

export const example: ProviderDef = {
  id: "example",
  name: "Example Remit",
  url: "https://example.com/send-money-to-bangladesh", // where users start a transfer
  domain: "example.com", // used to show the logo
  fetchQuotes: () =>
    atTiers(async (amount) => {
      const res = await getJson<{ rate: string; fee: string }>(
        `https://example.com/api/quote?from=GBP&to=BDT&amount=${amount}`,
      );
      return { sendAmount: amount, rate: num(res.rate), fee: num(res.fee), method: "bank" };
    }, [100, 1000]),
};
```

Then add it to the list in `src/lib/providers/index.ts` and run `bun run check:providers`.

Things to know:

- `rate` is BDT per £1 and `fee` is in GBP. `method` is `"bank"`, `"wallet"` (bKash and similar) or `"cash"`.
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
