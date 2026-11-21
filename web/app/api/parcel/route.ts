import { ParcelLookupQuery, type ParcelLookupResponse } from "@permitpike/contract";
import { fail, ok } from "@/lib/http";
import { lookupParcel } from "@/lib/server/parcel";

export const dynamic = "force-dynamic";

// GET /api/parcel?address=&zip=   or   GET /api/parcel?pid=
// Wraps the compliance MCP's parcel and zoning lookup. Always answers within ~3 seconds.
export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const query = ParcelLookupQuery.safeParse(params);
  if (!query.success) return fail("bad_request", "Give an address (and optional 5-digit zip) or a 10-digit pid.", query.error.issues);
  return ok<ParcelLookupResponse>(await lookupParcel(query.data));
}
