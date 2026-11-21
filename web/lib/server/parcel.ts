import "server-only";
import { Parcel, type ParcelLookupQuery, type ParcelLookupResponse } from "@permitpike/contract";
import { z } from "zod";
import demo from "@/lib/parcel/demo-parcels.json";
import { LOOKUP_BUDGET_MS, resolveParcel, streetKey } from "@/lib/parcel/resolve";

/*
 * Parcel lookups for /api/parcel and for filing. Order: the cached demo parcels
 * (so the stage demo never depends on the city's servers), then this instance's
 * memory cache, then the live compliance lookup with its 3-second budget.
 */

const DEMO = z.array(Parcel).parse(demo);

function demoMatch(query: ParcelLookupQuery): Parcel | undefined {
  if ("pid" in query) return DEMO.find((p) => p.parcelId === query.pid);
  const street = streetKey(query.address);
  return DEMO.find((p) => {
    const [assessorStreet = "", locality = ""] = (p.assessorAddress ?? "").split(",");
    return streetKey(assessorStreet) === street && (!query.zip || locality.trim().endsWith(query.zip));
  });
}

const FILING_BUDGET_MS = 10_000;

const cache = new Map<string, ParcelLookupResponse>();
const keyOf = (q: ParcelLookupQuery) => ("pid" in q ? `pid:${q.pid}` : `addr:${streetKey(q.address)}|${q.zip ?? ""}`);

export async function lookupParcel(query: ParcelLookupQuery, budgetMs = LOOKUP_BUDGET_MS): Promise<ParcelLookupResponse> {
  const fixture = demoMatch(query);
  if (fixture) return { result: "found", parcel: fixture };

  const key = keyOf(query);
  const hit = cache.get(key);
  if (hit) return hit;

  const res = await resolveParcel(query, budgetMs);
  // Don't remember failures: the next try may get through.
  if (res.result !== "unavailable") {
    cache.set(key, res);
    if (res.result === "found") cache.set(keyOf({ pid: res.parcel.parcelId }), res);
  }
  return res;
}

/**
 * The parcel to save on a new application: the one the applicant confirmed, else a
 * single match for the address. Null when neither works; filing never waits on it.
 */
export async function parcelForFiling(parcelId: string | null | undefined, street: string, zip: string): Promise<Parcel | null> {
  // Runs after the response, so it can wait longer than the 3 seconds a person waits.
  const query: ParcelLookupQuery = parcelId ? { pid: parcelId } : { address: street, zip };
  const res = await lookupParcel(query, FILING_BUDGET_MS);
  return res.result === "found" ? res.parcel : null;
}
