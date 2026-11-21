import "server-only";
import type { z } from "zod";

/**
 * Loads a page's first data on the server, shaped exactly as the API client would see it:
 * through JSON and the contract schema. Any failure returns undefined, and the client then
 * fetches as it would have without a prefetch.
 */
export async function prefetch<S extends z.ZodType>(schema: S, load: () => Promise<unknown>): Promise<z.infer<S> | undefined> {
  try {
    const value = await load();
    if (value == null) return undefined;
    const parsed = schema.safeParse(JSON.parse(JSON.stringify(value)));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
