/**
 * pnpm db:check (from the repo root): row counts for every PermitPike table and the
 * 5 newest buckets of the permits_weekly continuous aggregate. Read-only.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { getDb } from "@permitpike/db";

const rootEnv = resolve(import.meta.dirname, "../.env");
if (!process.env.DATABASE_URL && existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const TABLES = [
  "applicants",
  "applications",
  "application_versions",
  "reviewer_actions",
  "eval_runs",
  "boston_permits",
  "permits_weekly",
] as const;

async function main() {
  const db = getDb();

  console.log("Row counts");
  for (const table of TABLES) {
    const [row] = await db.execute<{ n: string }>(sql`select count(*)::text as n from ${sql.identifier(table)}`);
    console.log(`  ${table.padEnd(22)} ${row?.n ?? "?"}`);
  }

  const newest = await db.execute<{ bucket: Date; worktype: string | null; zip: string | null; permits: string }>(
    sql`select bucket, worktype, zip, permits::text from permits_weekly order by bucket desc limit 5`,
  );
  console.log("\npermits_weekly, 5 newest rows");
  if (newest.length === 0) console.log("  (empty: load boston_permits, then the refresh policy fills it)");
  for (const r of newest) {
    const week = new Date(r.bucket).toISOString().slice(0, 10);
    console.log(`  ${week}  ${(r.worktype ?? "-").padEnd(10)} ${(r.zip ?? "-").padEnd(6)} ${r.permits}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
