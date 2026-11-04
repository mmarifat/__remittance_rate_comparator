// Applies the SQL migrations in drizzle/ to the database in DATABASE_URL (or DATABASE_URL_UNPOOLED).
//   bun run db:migrate
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { migrationUrl } from "../src/db/client";

const url = migrationUrl();
if (!url) {
  console.error("Set DATABASE_URL (e.g. from `vercel env pull .env.local`) first.");
  process.exit(1);
}
const pool = new Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  console.log("Database is up to date.");
} finally {
  await pool.end();
}
