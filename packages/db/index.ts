import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let db: Db | undefined;

/** Lazy so importing this module never needs DATABASE_URL (mock mode, builds). */
export function getDb(): Db {
  if (db) return db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // prepare: false keeps us compatible with Tiger Data's connection pooler.
  db = drizzle(postgres(url, { prepare: false, max: 5, idle_timeout: 20 }), { schema });
  return db;
}
