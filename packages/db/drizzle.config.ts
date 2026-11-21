import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

// Local dev: one .env at the repo root. On CI/hosts DATABASE_URL is already set.
const rootEnv = resolve(process.cwd(), "../../.env") // drizzle-kit runs from packages/db;
if (!process.env.DATABASE_URL && existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default defineConfig({
  dialect: "postgresql",
  schema: "./schema.ts",
  out: "./migrations",
  dbCredentials: {
    // `generate` does not connect, so a placeholder is fine there.
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/permitpike",
  },
});
