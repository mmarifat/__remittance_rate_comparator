import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema";

/** Any Drizzle Postgres database with our schema: node-postgres in the app, PGlite in tests. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<PgQueryResultHKT, typeof schema> | PgDatabase<any, typeof schema>;

/**
 * The connection string. Vercel's Neon integration sets DATABASE_URL (pooled) and POSTGRES_URL;
 * any standard Postgres works, so the API can move to other infrastructure unchanged.
 */
export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

/** For migrations, which need a direct connection rather than the pooler. */
export function migrationUrl(): string | undefined {
  return process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || databaseUrl();
}

export function connect(url: string) {
  // A small pool per function instance: each request makes a few short queries, and an instance serves
  // many requests at once. Queries are never named prepared statements, so poolers in transaction mode
  // (Neon's, PgBouncer) work; don't add `.prepare()` or session state.
  const pool = new Pool({ connectionString: url, max: 10, idleTimeoutMillis: 5_000, connectionTimeoutMillis: 10_000 });
  // An idle connection the database drops (a restart, a network blip) is reported here; without a
  // listener it would be an uncaught error that takes the instance down. The pool replaces it.
  pool.on("error", (err) => console.error("[db] idle connection failed", err.message));
  // On Vercel, keeps a function alive just long enough to close idle connections before it's
  // suspended, so they don't pile up on the database. Does nothing elsewhere.
  attachDatabasePool(pool);
  return drizzle(pool, { schema });
}

// One client per server instance (and per dev server, surviving hot reloads).
const cache = globalThis as unknown as { __rrcDb?: Db | null; __rrcDbOverride?: Db };

/** The database, or null when none is configured: the public comparison site works without one. */
export function getDb(): Db | null {
  if (cache.__rrcDbOverride) return cache.__rrcDbOverride;
  if (cache.__rrcDb === undefined) {
    const url = databaseUrl();
    cache.__rrcDb = url ? connect(url) : null;
  }
  return cache.__rrcDb;
}

/** Points the app at another database (an in-memory PGlite in tests); undefined restores the default. */
export function setDbForTests(db: Db | undefined) {
  cache.__rrcDbOverride = db;
}
