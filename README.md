<p align="center">
  <img src="public/logo.svg" alt="Remittance Rate Comparator logo" width="96" height="96">
</p>

<h1 align="center">Remittance Rate Comparator</h1>

<p align="center">
  Live money transfer rates to Bangladesh and Pakistan from the UK, eurozone, US and Canada, best rate first.<br>
  <a href="https://remittance-rate-comparator.vercel.app"><strong>remittance-rate-comparator.vercel.app</strong></a>
</p>

<p align="center">
  <a href="https://github.com/mmarifat/__remittance_rate_comparator/actions/workflows/ci.yml"><img src="https://github.com/mmarifat/__remittance_rate_comparator/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-006a4e" alt="MIT license"></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/contributions-welcome-f5c04a" alt="Contributions welcome"></a>
</p>

Pick the currency you send (and, for euros, your country), where it's going (taka or rupees), an amount and a payout method (bank account, a mobile wallet such as bKash or JazzCash / Easypaisa, or cash pickup), and see what each service gives: the rate, the fee, and what the recipient gets. Switch on "I'm a new customer" to rank by first-transfer deals instead of regular prices.

| You send | Sending from | To Bangladesh (BDT) | To Pakistan (PKR) |
| --- | --- | --- | --- |
| GBP | United Kingdom | 26, including LemFi, Dahabshiil, Transfer Galaxy and UK specialists SonaliPay, RizRemit, REMITnGO (BRAC Saajan), NEC Money, RemitChoice, IFIC Money Transfer and BA Exchange | 23, including LemFi, Dahabshiil, Transfer Galaxy, RizRemit, NEC Money and RemitChoice |
| EUR | Italy (default), Spain, France, Germany, Portugal or Ireland | 19 from Italy, including LemFi, Dahabshiil, Transfer Galaxy and National Exchange Co.; 17 or 18 elsewhere | 19 from Italy, the same plus OFX; 16 or 17 elsewhere |
| USD | United States | 16, including Pangea, BOSS Money and Sonali Exchange | 15, including LemFi and BOSS Money |
| CAD | Canada | 16, including LemFi, Dahabshiil and BMO | 14, including LemFi and Dahabshiil |

There's also a [rates API](docs/api.md) for businesses: the same live rates, behind API keys with per-plan limits. It checks providers when asked, sharing the page's two-minute cache; Postgres holds only customers, keys and usage.

The logo is a ranked list in miniature: three routes, shortest at the bottom, with the best one in gold and heading out as an arrow.

## How it works

- `src/lib/corridors.ts` lists the corridors and destinations (Bangladesh and Pakistan, with the codes and payout names each needs). `src/lib/providers/` has one file per service with a `ROUTES` table: for each corridor it serves, the page users start on and the request details that corridor needs. Each file calls that service's public price calculator (the same request its website makes) and returns quotes as `{ sendAmount, rate, fee, method }`, in the sending currency.
- `src/lib/snapshot.ts` queries every provider in parallel, caps each one at 20s, drops rates that are more than 10% away from mid-market (a sign the response format changed), and records failures without breaking the rest.
- `/api/rates?corridor=EUR-BDT&stream=1` sends each provider as newline-delimited JSON the moment it answers, so the list fills in progressively instead of waiting for the slowest service. `/api/rates` without `stream` returns the whole snapshot as JSON.
- Both serve the check with a 2-minute cache: Vercel's CDN shares one response across visitors, and each server instance keeps its latest result in memory, so providers are asked at most about once every 2 minutes however busy the site gets. The page calls it on load and when you press Refresh, and a yellow banner suggests refreshing once the rates on screen are 10 minutes old.
- Amounts are compared for the same total spend: the fee comes out of what you pay, and the rest is converted.
- Providers can attach a first-transfer deal to a quote (a better rate, a lower fee, and how much the better rate covers). With "I'm a new customer" on, the list ranks by those; a deal capped at, say, the first €500 is blended with the regular rate for the rest.
- Visitors start on their own currency: the page reads Vercel's `x-vercel-ip-country` header, so someone in Italy lands on EUR from Italy, in the US on USD, and so on (other eurozone countries get euro prices from Italy; visitors in Pakistan start on GBP to PKR; everywhere else starts on GBP to BDT). A shared link's choices always win.
- The currencies, country, amount, payout method and new-customer choice are kept in the address (`?from=EUR&to=PKR&country=ES&amount=500&method=wallet&new=1`), so a comparison can be shared as a link.

### Rate history and provider health

`.github/workflows/rate-history.yml` runs every hour. It reads the live site's `/api/rates` (so it adds no load on providers), appends each provider's headline rate to one file per corridor in [`history/` on the `data` branch](../../tree/data/history), and keeps 30 days. Euro history is recorded for Italy only, so trends appear there. The page shows the last 7 days as a trend per provider, served through `/api/history`. The [API](docs/api.md)'s history reads the same files.

The same job watches provider health: if a provider fails every check for 6 hours, it opens a GitHub issue labelled `provider-health`, and closes it when the provider answers again.

Some services are covered through another source when their own calculator is unavailable:

| Service | Source |
| --- | --- |
| Remitly, Instarem, Western Union, MoneyGram, Xoom | Own calculator, falling back to Wise's published comparison data |
| TransferGo (GBP) | Own calculator, falling back to NALA's rate feed |
| Skrill (GBP), BMO (CAD), OFX (to Pakistan) | Wise's comparison data only |
| Sonali Exchange (USD), National Exchange Co. (EUR) | The rates page on their own website |
| Taptap Send | Rates from its own feed; fees from its Bangladesh and Pakistan pages, which the feed doesn't include |
| LemFi | The rate and fee rule printed in its corridor pages (its calculator's JSON API scrambles the rate, so it isn't used) |
| IFIC Money Transfer, BA Exchange | The public "check rates" form on their online portals, which prices a transfer before you log in |
| Transfer Galaxy | The quote form on its destination pages, which shows the standard price next to its new-customer offer |

## Develop

```bash
bun install
bun run dev              # http://localhost:3000
bun run test             # vitest
bun run check:providers          # query every GBP provider once and print the results
bun run check:providers USD-PKR  # one corridor, or `all`
```

The API needs Postgres; see [docs/api.md](docs/api.md#running-it). `bun run test` runs the database tests against an in-memory Postgres (PGlite), so no server is needed for those.

`check:providers` is the quickest way to see which provider has broken after a site change. Don't run it in a tight loop: several providers rate-limit (TransferGo's Cloudflare blocks an IP for an hour after a burst).

## Deploy (Vercel)

The live site deploys from `main` automatically. To run your own copy, import the repo at [vercel.com/new](https://vercel.com/new). The comparison page needs no environment variables. The API needs `DATABASE_URL` and `CRON_SECRET`; see [docs/api.md](docs/api.md#running-it).

`vercel.json` pins functions to London (`lhr1`) because some providers price by the caller's location.

## Contributing

Contributions are welcome, especially fixing a provider that stopped working or adding a new one. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, a provider template, and the ground rules.

Every request to a provider carries an `X-Open-Source-Client: Remittance Rate Comparator (+https://github.com/mmarifat/__remittance_rate_comparator)` header, so providers can see who is asking and where the code lives.

## Caveats

- These are unofficial uses of public calculators, and any provider can change or block them. A failed provider appears under "Couldn't check just now" with a link to its site.
- Vercel runs on datacenter IPs, which some bot protection treats more strictly than home connections. MoneyGram and Xoom currently block requests from Vercel, and Remitly's own calculator does too (it falls back to Wise's comparison data).
- XE's quote response states that automatic extraction of rates is prohibited under its Terms of Use. To drop XE, remove it from `src/lib/providers/index.ts`.
- First-transfer promotions are shown as notes; the ranking uses regular pricing where the provider exposes it.
- National Exchange Co. doesn't publish its fees, so its fee shows as "Not listed" and it's never marked as giving the most money after fees.
- The [rates API](docs/api.md) resells data from these public calculators. Several providers' terms restrict automated access or commercial reuse; see [docs/market-research.md](docs/market-research.md) before charging for it.
- Not included: ACE Money Transfer, Remitbee, Placid Express, Revolut, Majority and ShareMoney (Cloudflare blocks non-browser requests, and none appears in a public comparison feed), CIBC Global Money Transfer (needs a login), Afriex (no public calculator), MoneyTO (its calculator only gives its first-transfer rate), Small World (stopped trading in 2024; its domain is now an unrelated site). Boss Revolution uses the same calculator and prices as BOSS Money, so it's listed once. [docs/market-research.md](docs/market-research.md) has the full survey.

## Author

Made by **Md Minhaz Ahamed Rifat**: [GitHub](https://github.com/mmarifat) · [LinkedIn](https://www.linkedin.com/in/mmarifat6/)

## License

[MIT](LICENSE)
