import { date, index, integer, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

// The database holds API customers only: organizations, their keys, and usage counters. Rates are
// checked live (sharing the comparison page's short cache) and never stored here; hourly history
// lives on the repository's data branch.

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const organizationStatus = pgEnum("organization_status", ["active", "suspended"]);

// ── API customers ──

export const organizations = pgTable("organizations", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  /** A key of PLANS in src/lib/api/plans.ts. */
  plan: text().notNull().default("free"),
  status: organizationStatus().notNull().default("active"),
  createdAt: createdAt(),
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text().notNull(),
    /** The start of the key, safe to show (e.g. "rrc_live_a1B2c3"), to tell keys apart. */
    prefix: text().notNull(),
    /** SHA-256 of the full key, hex. The key itself is shown once and never stored. */
    keyHash: text("key_hash").notNull().unique(),
    createdAt: createdAt(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("api_keys_organization").on(t.organizationId)],
);

/** Requests per key per UTC day: the usage record, and the basis for monthly quotas. */
export const apiUsageDaily = pgTable(
  "api_usage_daily",
  {
    apiKeyId: uuid("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    day: date({ mode: "string" }).notNull(),
    requests: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.apiKeyId, t.day] }), index("api_usage_daily_organization").on(t.organizationId, t.day)],
);

/** Requests per key per minute, for rate limiting. Rows older than a day are pruned. */
export const apiRateWindows = pgTable(
  "api_rate_windows",
  {
    apiKeyId: uuid("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    requests: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.apiKeyId, t.windowStart] })],
);
