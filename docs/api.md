# Rates API

Money transfer rates and fees to Bangladesh (BDT) and Pakistan (PKR) from the UK, eurozone, US and Canada, from every provider the comparison site checks. Rates are checked live when you ask, through the same short cache the comparison page uses: callers asking about the same corridor and sending country within two minutes share one check. No rates are stored in the database.

The machine-readable description is at [`/api/v1/openapi.json`](../src/lib/api/openapi.ts).

## Authentication

Every endpoint except `openapi.json` needs an API key:

```bash
curl -H "Authorization: Bearer rrc_live_…" "https://remittance-rate-comparator.vercel.app/api/v1/compare?corridor=GBP-PKR&amount=500&method=wallet"
```

`X-API-Key: rrc_live_…` works too. Keys are never accepted in the query string, because URLs end up in logs. Keep keys on your server; the API doesn't allow calls from browsers on other sites.

## Limits

| Plan | Requests a minute, per key | Requests a month, per organization |
| --- | --- | --- |
| free | 30 | 10,000 |
| pro | 300 | 1,000,000 |
| enterprise | 1,200 | 10,000,000 |

Each response to a valid key on an active account carries `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` (seconds until the minute resets) for the key, plus `X-Quota-Limit` and `X-Quota-Remaining` for the organization's month (UTC). Over a limit, the answer is `429` with `Retry-After`: seconds until the next month starts for `quota_exceeded` (also sent as `X-Quota-Reset`), which takes precedence, or until the minute resets for `rate_limited`.

Every attempt counts towards the minute, so retrying in a tight loop stays limited. Only requests that aren't refused for a limit count towards the month, and those are what `usage` reports; a request refused for a bad parameter still counts. Requests from a suspended account aren't counted. When several requests arrive at once just as the quota runs out, a few more than the quota may be served.

## Corridors

`corridor` is the sending and receiving currency: `GBP-BDT`, `EUR-BDT`, `USD-BDT`, `CAD-BDT`, `GBP-PKR`, `EUR-PKR`, `USD-PKR`, `CAD-PKR`. You can pass `from=GBP&to=PKR` instead, on every endpoint; `from` and `to` always mean currencies. Passing only one of them is an error.

`country` picks the sending country where a currency is sent from several (euros: IT by default, also ES, FR, DE, PT, IE). Rates work from every listed country.

## Endpoints

### `GET /api/v1/compare`

Providers ranked for sending an amount, fees included: the same ranking as the comparison page.

| Parameter | |
| --- | --- |
| `corridor` | Required, e.g. `GBP-PKR` |
| `amount` | Required. What the sender pays in total, fees included, in the sending currency: above 0 and at most 100000 |
| `method` | `bank` (default), `wallet` (bKash, JazzCash, Easypaisa and so on) or `cash` |
| `newCustomer` | `true` (or `1`) to price with first-transfer deals; `false`, `0` or absent otherwise |

```json
{
  "corridor": "GBP-PKR", "from": "GBP", "to": "PKR", "sendCountry": "GB", "receiveCountry": "PK",
  "checkedAt": "2026-11-04T12:23:00.000Z", "midMarket": 373.29,
  "amount": 500, "method": "wallet", "newCustomer": false,
  "offers": [
    {
      "rank": 1,
      "provider": { "id": "ria", "name": "Ria", "domain": "riamoneytransfer.com", "url": "https://www.riamoneytransfer.com/en-gb/send-money-to-pakistan/" },
      "rate": 373.96, "fee": 0, "feeUnknown": false, "receive": 186980, "effectiveRate": 373.96,
      "newCustomerPrice": false, "note": "First transfer: 374.90"
    }
  ],
  "bestRate": "ria",
  "mostReceived": "ria",
  "notOffered": [{ "id": "wise", "name": "Wise", "reason": "method_not_offered" }]
}
```

`checkedAt` is when the providers were asked: within the last two minutes. A call that starts a fresh check waits for every provider to answer, usually a few seconds and at most about 20.

`notOffered` lists the providers left out of `offers` and why: `unavailable` (it didn't answer this check), `method_not_offered` (no such payout) or `fee_exceeds_amount`.

`rate` is the rate applied to the amount after the fee. `receive` is what the recipient gets. `effectiveRate` is `receive` divided by `amount`, so it accounts for the fee. `mostReceived` is the offer that delivers the most money, which isn't always the best rate. Offers with an unpublished fee (`feeUnknown: true`, `fee: null`) are never `mostReceived`.

### `GET /api/v1/rates`

Every provider's status and raw quotes for a corridor, checked live. Each quote applies from `sendAmount` up to the next quote's amount. Where a provider shows a first-transfer deal, the quote carries it as `newCustomer: { rate, fee, upTo }`.

### `GET /api/v1/providers`, `GET /api/v1/corridors`

The catalogue: which providers serve which corridors and sending countries.

### `GET /api/v1/usage`

Your plan, requests this month, and requests per day.

## Errors

Errors look like `{ "error": { "code": "invalid_amount", "message": "…" } }`.

| Status | Codes |
| --- | --- |
| 400 | `invalid_corridor`, `invalid_country`, `invalid_amount`, `invalid_method`, `invalid_newcustomer` |
| 401 | `missing_api_key`, `invalid_api_key` (unknown, revoked or expired) |
| 403 | `account_suspended` |
| 429 | `rate_limited`, `quota_exceeded` |
| 500 | `internal_error` |
| 503 | `not_configured`, `unavailable` |

## What's in the data

- Prices come from each provider's public calculator, the same one its website uses. Where a provider's own calculator blocks us, the price may come from Wise's published comparison data, and the provider's `note` says so.
- Regular prices are used for ranking. First-transfer deals are only applied with `newCustomer=true`.
- Fees are in the sending currency. Some providers don't publish fees; those quotes have `feeUnknown: true`.
- XE is left out of the API (it's still on the comparison page): its responses say automated extraction of its rates isn't allowed. To leave out more, set `API_EXCLUDED_PROVIDERS=id,id` in the environment. No code change is needed, and since no rates are stored there is nothing to purge.

## Running it

The API needs a Postgres database for its customers, keys and usage counters, nothing else, so it stays a few megabytes. On Vercel, add one from the Marketplace (Neon has a free plan), which sets `DATABASE_URL`. Any other Postgres works the same way: just set `DATABASE_URL`.

1. Pull the variables and create the tables:
   ```bash
   vercel env pull .env.local
   bun --env-file=.env.local run db:migrate
   ```
2. Create a customer and a key. The key is shown once:
   ```bash
   bun --env-file=.env.local run admin create-org "SonaliPay" --plan pro
   bun --env-file=.env.local run admin create-key <organization id> "Production"
   ```
   `admin` also lists, revokes, changes plans and suspends. See the top of `scripts/admin.ts`.

Nothing runs on a schedule. Providers are asked only when someone calls the API or opens the comparison page.

Schema changes: edit `src/db/schema.ts`, run `bun run db:generate` to write a migration to `drizzle/`, commit it, and run `db:migrate` against the database before or as you deploy.

### Tables

| Table | What it holds |
| --- | --- |
| `organizations`, `api_keys` | Customers and their keys. Only a SHA-256 hash of each key is stored |
| `api_usage_daily` | Requests per key per UTC day: usage, and the basis for monthly quotas |
| `api_rate_windows` | Each key's requests in its latest minute, for rate limiting. One row per key, overwritten |
