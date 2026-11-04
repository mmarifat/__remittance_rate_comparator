import { defineConfig } from "drizzle-kit";

// `bun run db:generate` writes SQL migrations for schema changes to drizzle/; `bun run db:migrate` applies them.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || "",
  },
});
