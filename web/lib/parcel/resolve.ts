/**
 * Address or parcel ID -> Parcel, using the compliance package's Boston lookup
 * (packages/compliance/parcel-zoning.ts, the MCP's resolve_parcel_zoning tool).
 * That lookup returns zoning but no WGS84 geometry, so the outline comes from the
 * same city parcels layer it names in `sources.parcels`, by parcel ID, as GeoJSON.
 *
 * No server-only import: web/scripts/cache-parcels.ts runs this outside Next.
 */
import { lookupParcelZoning } from "@permitpike/compliance/parcel-zoning";
import {
  ParcelOutline,
  ZoningDistrict,
  ZoningOverlay,
  type Parcel,
  type ParcelLookupQuery,
  type ParcelLookupResponse,
} from "@permitpike/contract";
import { z } from "zod";

/** Past this the map is "unavailable" and filing goes on without it. */
export const LOOKUP_BUDGET_MS = 3000;

const GeoJsonFeatures = z.object({
  features: z.array(z.object({ geometry: ParcelOutline.nullable() })),
});

async function fetchOutline(parcelsLayer: string, parcelId: string, signal: AbortSignal): Promise<ParcelOutline | null> {
  const qs = new URLSearchParams({
    where: `map_par_id = '${parcelId}'`,
    outFields: "map_par_id",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
  });
  const res = await fetch(`${parcelsLayer}/query?${qs}`, { redirect: "error", signal });
  if (!res.ok) return null;
  const parsed = GeoJsonFeatures.safeParse(await res.json());
  if (!parsed.success) return null;
  const shapes = parsed.data.features.flatMap((f) => (f.geometry ? [f.geometry] : []));
  if (shapes.length === 0) return null;
  if (shapes.length === 1) return shapes[0]!;
  return {
    type: "MultiPolygon",
    coordinates: shapes.flatMap((s) => (s.type === "Polygon" ? [s.coordinates] : s.coordinates)),
  };
}

type Ring = [number, number][];

/** Area-weighted centroid of the largest polygon's outer ring. Planar math is fine at parcel scale. */
export function centroid(outline: ParcelOutline): { lat: number; lng: number } {
  const polygons = outline.type === "Polygon" ? [outline.coordinates] : outline.coordinates;
  let best = { area: -1, lng: 0, lat: 0 };
  for (const polygon of polygons) {
    const ring = polygon[0] as Ring;
    // Work relative to the first vertex: raw lon/lat products cancel and lose precision.
    const [ox, oy] = ring[0]!;
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const x0 = ring[i]![0] - ox;
      const y0 = ring[i]![1] - oy;
      const x1 = ring[i + 1]![0] - ox;
      const y1 = ring[i + 1]![1] - oy;
      const cross = x0 * y1 - x1 * y0;
      a += cross;
      cx += (x0 + x1) * cross;
      cy += (y0 + y1) * cross;
    }
    const area = Math.abs(a / 2);
    if (area > best.area) {
      best = area > 0
        ? { area, lng: ox + cx / (3 * a), lat: oy + cy / (3 * a) }
        : { area, lng: ox, lat: oy };
    }
  }
  return { lat: best.lat, lng: best.lng };
}

async function resolve(query: ParcelLookupQuery, signal: AbortSignal): Promise<ParcelLookupResponse> {
  const input = "pid" in query ? { parcelId: query.pid } : { street: query.address, ...(query.zip ? { zip: query.zip } : {}) };
  const r = await lookupParcelZoning(input);

  if ("candidates" in r && r.status === "ambiguous_address") {
    return { result: "ambiguous", candidates: r.candidates ?? [] };
  }
  if (!("parcel" in r) || !r.parcel) {
    if (r.status === "unavailable") return { result: "unavailable", message: r.message };
    return { result: "not_found", message: "message" in r ? r.message : "No Boston parcel matches that address." };
  }

  const outline = await fetchOutline(r.sources.parcels, r.parcel.parcelId, signal).catch(() => null);
  if (!outline) {
    return { result: "unavailable", message: "The city returned no boundary for this parcel." };
  }
  const parcel: Parcel = {
    parcelId: r.parcel.parcelId,
    assessorAddress: r.parcel.addresses[0] ?? null,
    ...centroid(outline),
    outline,
    match: r.status === "multiple_zones" ? "multiple_zones" : r.status === "matched" ? "matched" : "partial",
    districts: z.array(ZoningDistrict).parse("districts" in r ? r.districts : []),
    overlays: z.array(ZoningOverlay).parse(("possibleOverlayIntersections" in r && r.possibleOverlayIntersections) || []),
    retrievedAt: ("retrievedAt" in r && r.retrievedAt) || new Date().toISOString(),
  };
  return { result: "found", parcel };
}

/** Never throws. Errors and lookups slower than the budget come back as "unavailable". */
export async function resolveParcel(query: ParcelLookupQuery, budgetMs = LOOKUP_BUDGET_MS): Promise<ParcelLookupResponse> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<ParcelLookupResponse>((done) => {
    timer = setTimeout(() => {
      controller.abort();
      done({ result: "unavailable", message: "The city's parcel lookup took too long." });
    }, budgetMs);
  });
  try {
    return await Promise.race([
      resolve(query, controller.signal).catch(
        (): ParcelLookupResponse => ({ result: "unavailable", message: "The city's parcel lookup failed." }),
      ),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

const SUFFIX: Record<string, string> = {
  STREET: "ST", AV: "AVE", AVENUE: "AVE", ROAD: "RD", BOULEVARD: "BLVD", PLACE: "PL", SQUARE: "SQ",
  DRIVE: "DR", TERRACE: "TER", COURT: "CT", LANE: "LN", PARKWAY: "PKWY", CIRCLE: "CIR",
};

/** "58 Brookside Avenue" and "58 BROOKSIDE AV" both become "58 BROOKSIDE AVE". */
export function streetKey(street: string): string {
  const words = street.toUpperCase().replace(/[.,]/g, " ").trim().split(/\s+/);
  const last = words.at(-1);
  if (words.length > 1 && last && SUFFIX[last]) words[words.length - 1] = SUFFIX[last];
  return words.join(" ");
}
