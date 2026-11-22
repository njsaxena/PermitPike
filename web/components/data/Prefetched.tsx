"use client";

import type { ReactNode } from "react";
import { SWRConfig, unstable_serialize } from "swr";

/** One SWR key and the data the server already loaded for it. */
export type PrefetchedEntry = { key: unknown[] | string; data: unknown };

/**
 * Seeds SWR with data the server loaded while rendering the page, so the first paint shows
 * the real queue or permit instead of an empty shell that fills in a second later. SWR still
 * revalidates and polls as before; entries whose data is undefined are skipped.
 */
export function Prefetched({ entries, children }: { entries: PrefetchedEntry[]; children: ReactNode }) {
  const fallback: Record<string, unknown> = {};
  for (const { key, data } of entries) {
    if (data !== undefined) fallback[unstable_serialize(key)] = data;
  }
  return <SWRConfig value={{ fallback }}>{children}</SWRConfig>;
}
