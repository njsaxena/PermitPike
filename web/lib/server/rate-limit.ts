import "server-only";
import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { getDb, trackRateLimits } from "@permitpike/db";

/*
 * Fixed one-minute windows in Tiger Data, so the limit holds across every Vercel
 * function instance (an in-memory counter would reset per instance). The key is a
 * SHA-256 of the scope and IP; the IP itself is never stored.
 */

const WINDOW_MS = 60_000;

/** First address in x-forwarded-for (Vercel sets it), else x-real-ip. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Counts this request. Returns false once the caller is over `limit` in the current minute. */
export async function allowRequest(scope: string, ip: string, limit: number): Promise<boolean> {
  const key = createHash("sha256").update(`${scope}:${ip}`).digest("hex");
  const now = Date.now();
  const windowStart = new Date(now - (now % WINDOW_MS));
  const db = getDb();
  const [row] = await db
    .insert(trackRateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [trackRateLimits.key, trackRateLimits.windowStart],
      set: { count: sql`${trackRateLimits.count} + 1` },
    })
    .returning({ count: trackRateLimits.count });
  // Keep the table small: roughly one request in 50 clears windows older than 5 minutes.
  if (Math.random() < 0.02) {
    await db
      .delete(trackRateLimits)
      .where(lt(trackRateLimits.windowStart, new Date(now - 5 * WINDOW_MS)))
      .catch(() => {});
  }
  return (row?.count ?? 1) <= limit;
}
