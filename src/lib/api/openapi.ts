import { CORRIDORS } from "../corridors";
import { PLANS } from "./plans";

const corridorParams = [
  {
    name: "corridor",
    in: "query",
    description: "Sending and receiving currency, e.g. GBP-PKR. Or pass `from` and `to` instead.",
    schema: { type: "string", enum: CORRIDORS.map((c) => c.id) },
  },
  { name: "from", in: "query", schema: { type: "string", example: "GBP" } },
  { name: "to", in: "query", schema: { type: "string", enum: ["BDT", "PKR"] } },
  {
    name: "country",
    in: "query",
    description: "Sending country (ISO 3166 alpha-2). Defaults to the corridor's main country. Live rates work from every listed country; history covers the main one only.",
    schema: { type: "string", example: "GB" },
  },
];

const error = {
  description: "Error",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: { error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" } } } },
      },
    },
  },
};

/** `2026-11-03`, or `2026-11-03T10:00:00Z`. */
const dateOrTime = { anyOf: [{ type: "string", format: "date" }, { type: "string", format: "date-time" }] };

const errors = { 400: error, 401: error, 403: error, 404: error, 429: error, 500: error, 503: error };

const ok = (description: string, schema: object) => ({ description, content: { "application/json": { schema } } });

const quote = {
  type: "object",
  properties: {
    method: { type: "string", enum: ["bank", "wallet", "cash"] },
    sendAmount: { type: "number", description: "This price applies from this amount, in the sending currency." },
    rate: { type: "number", description: "Receiving currency per unit of the sending currency (regular price)." },
    fee: { type: ["number", "null"], description: "In the sending currency; null when the provider doesn't publish it." },
    feeUnknown: { type: "boolean" },
    newCustomer: {
      type: "object",
      description: "First-transfer deal, when the provider shows one.",
      properties: { rate: { type: "number" }, fee: { type: "number" }, upTo: { type: "number" } },
    },
  },
};

/** OpenAPI 3.1 description of /api/v1, served at /api/v1/openapi.json. */
export function openApiDocument(serverUrl: string) {
  const plans = Object.entries(PLANS)
    .map(([id, p]) => `${id}: ${p.requestsPerMinute}/min, ${p.requestsPerMonth.toLocaleString("en-GB")}/month`)
    .join("; ");
  return {
    openapi: "3.1.0",
    info: {
      title: "Remittance Rate Comparator API",
      version: "1.0.0",
      description: `Money transfer rates and fees to Bangladesh (BDT) and Pakistan (PKR) from the UK, eurozone, US and Canada, checked live from each provider's public calculator (callers within two minutes share one check). History: the last 30 days, hourly. Plans: ${plans}.`,
    },
    servers: [{ url: serverUrl }],
    // Either header works.
    security: [{ bearer: [] }, { apiKeyHeader: [] }],
    components: {
      securitySchemes: {
        bearer: { type: "http", scheme: "bearer", description: "Your API key, e.g. rrc_live_…" },
        apiKeyHeader: { type: "apiKey", in: "header", name: "X-API-Key", description: "Your API key, as an alternative to the Bearer header." },
      },
      headers: {
        "X-RateLimit-Remaining": { schema: { type: "integer" }, description: "Requests this key has left this minute." },
        "X-Quota-Remaining": { schema: { type: "integer" }, description: "Requests left this month." },
      },
    },
    paths: {
      "/api/v1/corridors": {
        get: {
          summary: "Corridors, their sending countries, and which have history",
          responses: { 200: ok("Corridors", { type: "object" }), ...errors },
        },
      },
      "/api/v1/providers": {
        get: {
          summary: "Providers and the corridors each serves",
          parameters: corridorParams.slice(0, 3),
          responses: { 200: ok("Providers", { type: "object" }), ...errors },
        },
      },
      "/api/v1/rates": {
        get: {
          summary: "Live rates and fees from every provider for a corridor",
          parameters: corridorParams,
          responses: {
            200: ok("Latest rates", {
              type: "object",
              properties: {
                corridor: { type: "string" },
                checkedAt: { type: "string", format: "date-time" },
                midMarket: { type: ["number", "null"] },
                providers: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      url: { type: "string" },
                      status: { type: "string", enum: ["ok", "error"] },
                      note: { type: "string" },
                      quotes: { type: "array", items: quote },
                    },
                  },
                },
              },
            }),
            ...errors,
          },
        },
      },
      "/api/v1/compare": {
        get: {
          summary: "Providers ranked for sending an amount, fees included",
          parameters: [
            ...corridorParams,
            {
              name: "amount",
              in: "query",
              required: true,
              description: "Total the sender pays, fees included.",
              schema: { type: "number", exclusiveMinimum: 0, maximum: 100_000 },
            },
            { name: "method", in: "query", schema: { type: "string", enum: ["bank", "wallet", "cash"], default: "bank" } },
            { name: "newCustomer", in: "query", description: "Price with first-transfer deals.", schema: { type: "boolean", default: false } },
          ],
          responses: { 200: ok("Ranked offers, best rate first", { type: "object" }), ...errors },
        },
      },
      "/api/v1/history": {
        get: {
          summary: "Headline rate history per provider over the last 30 days: hourly, or daily open/high/low/close",
          parameters: [
            ...corridorParams,
            { name: "interval", in: "query", description: "`day` gives open, high, low and close per UTC day, and widens the range to whole days.", schema: { type: "string", enum: ["hour", "day"], default: "hour" } },
            { name: "since", in: "query", description: "A date, or a date and time with Z or an offset. Default: 7 days before `until`. Moved up to 30 days ago at the earliest (`limited: true`).", schema: dateOrTime },
            { name: "until", in: "query", description: "A date, or a date and time with Z or an offset; a date alone includes that whole day. Default: now.", schema: dateOrTime },
            { name: "provider", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: ok("History", { type: "object" }), ...errors },
        },
      },
      "/api/v1/usage": {
        get: {
          summary: "Your plan, and requests used this month",
          responses: { 200: ok("Usage", { type: "object" }), ...errors },
        },
      },
    },
  };
}
