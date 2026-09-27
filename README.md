<p align="center">
  <img src="public/logo.svg" alt="Remittance Rate Comparator logo" width="96" height="96">
</p>

<h1 align="center">Remittance Rate Comparator</h1>

<p align="center">
  Live money transfer rates to Bangladesh from the UK, eurozone, US and Canada, best rate first.<br>
  <a href="https://remittance-rate-comparator.vercel.app"><strong>remittance-rate-comparator.vercel.app</strong></a>
</p>

<p align="center">
  <a href="https://github.com/mmarifat/__remittance_rate_comparator/actions/workflows/ci.yml"><img src="https://github.com/mmarifat/__remittance_rate_comparator/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-006a4e" alt="MIT license"></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/contributions-welcome-f5c04a" alt="Contributions welcome"></a>
</p>

Pick the currency you send, an amount and a payout method (bank account, bKash / wallet, or cash pickup), and see what each service gives: the rate, the fee, and the taka the recipient gets.

| You send | Sending from | Services |
| --- | --- | --- |
| GBP | United Kingdom | 21 |
| EUR | Italy (euro rates vary by country; Italy has the widest coverage) | 15 |
| USD | United States | 13 |
| CAD | Canada | 13 |

The logo is a ranked list in miniature: three routes, shortest at the bottom, with the best one in gold and heading out as an arrow.

## How it works

- `src/lib/corridors.ts` lists the corridors. `src/lib/providers/` has one file per service with a `ROUTES` table: for each corridor it serves, the page users start on and the request details that corridor needs. Each file calls that service's public price calculator (the same request its website makes) and returns quotes as `{ sendAmount, rate, fee, method }`, in the sending currency.
- `src/lib/snapshot.ts` queries every provider in parallel, caps each one at 20s, drops rates that are more than 10% away from mid-market (a sign the response format changed), and records failures without breaking the rest.
- `/api/rates?corridor=EUR-BDT&stream=1` sends each provider as newline-delimited JSON the moment it answers, so the list fills in progressively instead of waiting for the slowest service. `/api/rates` without `stream` returns the whole snapshot as JSON.
- Both serve the check with a 2-minute cache: Vercel's CDN shares one response across visitors, and each server instance keeps its latest result in memory, so providers are asked at most about once every 2 minutes however busy the site gets. The page calls it on load and when you press Refresh, and a yellow banner suggests refreshing once the rates on screen are 10 minutes old.
- Amounts are compared for the same total spend: the fee comes out of what you pay, and the rest is converted.
- The currency, amount and payout method are kept in the address (`?from=USD&amount=500&method=wallet`), so a comparison can be shared as a link.

### Rate history and provider health

`.github/workflows/rate-history.yml` runs every hour. It reads the live site's `/api/rates` (so it adds no load on providers), appends each provider's headline rate to one file per corridor in [`history/` on the `data` branch](../../tree/data/history), and keeps 30 days. The page shows the last 7 days as a trend per provider, served through `/api/history`.

The same job watches provider health: if a provider fails every check for 6 hours, it opens a GitHub issue labelled `provider-health`, and closes it when the provider answers again.

Some services are covered through another source when their own calculator is unavailable:

| Service | Source |
| --- | --- |
| Remitly, Instarem, Western Union | Own calculator, falling back to Wise's published comparison data |
| TransferGo (GBP) | Own calculator, falling back to NALA's rate feed |
| Skrill (GBP) | Wise's comparison data only |

## Develop

```bash
bun install
bun run dev              # http://localhost:3000
bun run test             # vitest
bun run check:providers          # query every GBP provider once and print the results
bun run check:providers USD-BDT  # one corridor, or `all`
```

`check:providers` is the quickest way to see which provider has broken after a site change. Don't run it in a tight loop: several providers rate-limit (TransferGo's Cloudflare blocks an IP for an hour after a burst).

## Deploy (Vercel)

The live site deploys from `main` automatically. To run your own copy, import the repo at [vercel.com/new](https://vercel.com/new). The defaults work, and no environment variables are needed.

`vercel.json` pins functions to London (`lhr1`) because some providers price by the caller's location.

## Contributing

Contributions are welcome, especially fixing a provider that stopped working or adding a new one. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, a provider template, and the ground rules.

Every request to a provider carries an `X-Open-Source-Client: Remittance Rate Comparator (+https://github.com/mmarifat/__remittance_rate_comparator)` header, so providers can see who is asking and where the code lives.

## Caveats

- These are unofficial uses of public calculators, and any provider can change or block them. A failed provider appears under "Couldn't check just now" with a link to its site.
- Vercel runs on datacenter IPs, which some bot protection treats more strictly than home connections. MoneyGram and Xoom currently block requests from Vercel, and Remitly's own calculator does too (it falls back to Wise's comparison data).
- XE's quote response states that automatic extraction of rates is prohibited under its Terms of Use. To drop XE, remove it from `src/lib/providers/index.ts`.
- First-transfer promotions are shown as notes; the ranking uses regular pricing where the provider exposes it.
- Not included: ACE Money Transfer (Cloudflare blocks non-browser requests), LemFi (obfuscates its rate), Small World (stopped trading in 2024), BA Exchange (only publishes an indicative rate).

## Author

Made by **Md Minhaz Ahamed Rifat**: [GitHub](https://github.com/mmarifat) · [LinkedIn](https://www.linkedin.com/in/mmarifat6/)

## License

[MIT](LICENSE)
