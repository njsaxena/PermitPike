import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { bostonZoningCode, bostonZoningViewer, zoningCodeLinks } from "./zoning-code-links";

const assessing = "https://gis.boston.gov/arcgis/rest/services/Assessing/properties_boston_gov/FeatureServer/0";
const parcels = "https://gis.boston.gov/arcgis/rest/services/Parcels/Parcels_current/FeatureServer/0";
const subdistricts = "https://gis.bostonplans.org/hosting/rest/services/Zoning_Subdistricts_Data/FeatureServer/0";
const overlays = "https://gis.bostonplans.org/hosting/rest/services/Zoning_Viewer_Overlays/MapServer";
const sources = { assessing, parcels, subdistricts, overlays, zoningViewer: bostonZoningViewer, zoningCode: bostonZoningCode };

const parcelId = z.string().regex(/^\d{10}$/u);
const inputSchema = z.object({
  street: z.string().trim().min(1).max(120).optional()
    .describe("Boston street address only, including number. Supply the ZIP separately."),
  zip: z.string().regex(/^\d{5}$/u).optional().describe("Boston ZIP code to narrow street address matches"),
  parcelId: parcelId.optional().describe("10-digit Boston parcel ID, including any leading zero"),
}).strict().refine(({ street, zip, parcelId: id }) => (
  Boolean(street && !id) || Boolean(id && !street && !zip)
), "Provide a street address with an optional ZIP, or a parcel ID.");

const streetSuffixes = [
  ["ST", "STREET"], ["AV", "AVE", "AVENUE"], ["RD", "ROAD"], ["BLVD", "BOULEVARD"],
  ["PL", "PLACE"], ["PLZ", "PLAZA"], ["SQ", "SQUARE"], ["DR", "DRIVE"], ["TER", "TERRACE"],
  ["CT", "COURT"], ["LN", "LANE"], ["WAY"], ["PKWY", "PARKWAY"], ["HWY", "HIGHWAY"],
  ["CIR", "CIRCLE"],
];

function quoted(value: string) {
  return `'${value.replace(/'/gu, "''")}'`;
}

function assessmentFilter(input: z.infer<typeof inputSchema>) {
  if (input.parcelId) {
    const id = quoted(input.parcelId);
    return `map_par_id = ${id} OR pid = ${id}`;
  }
  const match = input.street?.normalize("NFKC").toUpperCase().replace(/’/gu, "'").match(
    /^(\d{1,5})(?:\s*-\s*(\d{1,5}))?\s+([A-Z][A-Z0-9 .'-]*)$/u,
  );
  if (!match?.[1] || !match[3]) return null;

  const number = Number(match[1]);
  const lastNumber = match[2] ? Number(match[2]) : undefined;
  if (number > 32767 || (lastNumber !== undefined && (lastNumber > 32767 || lastNumber < number))) {
    return null;
  }
  const name = match[3].replace(/\./gu, "").replace(/\s+/gu, " ").trim();
  const parts = name.split(" ");
  const suffix = parts.at(-1);
  const aliases = parts.length > 1 && streetSuffixes.find((values) => values.some((value) => value === suffix));
  const names = aliases
    ? aliases.map((replacement) => [...parts.slice(0, -1), replacement].join(" "))
    : [name];
  const numberFilter = lastNumber !== undefined
    ? `st_num = ${number} AND st_num2 = ${lastNumber}`
    : `(st_num = ${number} OR (st_num < ${number} AND st_num2 >= ${number}))`;
  const zipFilter = input.zip ? ` AND zip_code = ${quoted(input.zip)}` : "";
  return `${numberFilter} AND UPPER(st_name) IN (${names.map(quoted).join(", ")})${zipFilter}`;
}

const assessment = z.object({
  attributes: z.object({
    map_par_id: z.string().nullable(),
    st_num: z.number().nullable(),
    st_num2: z.number().nullable(),
    st_name: z.string().nullable(),
    city: z.string().nullable(),
    zip_code: z.string().nullable(),
  }),
});
const ring = z.array(z.tuple([z.number(), z.number()])).min(4);
const geometry = z.object({ rings: z.array(ring).min(1) });
const parcelFeature = z.object({ geometry });
const subdistrictFeature = z.object({
  attributes: z.object({
    Zoning_District: z.string().nullable(),
    Zoning_Subdistrict: z.string().nullable(),
    Article: z.string().nullable(),
    Map_Number: z.string().nullable(),
  }),
});
const overlayMatch = z.object({
  layerId: z.number().int().nonnegative(),
  layerName: z.string().min(1),
  value: z.union([z.string(), z.number()]).nullish(),
});

function featureSet<T extends z.ZodType>(feature: T) {
  return z.object({ features: z.array(feature), exceededTransferLimit: z.boolean().optional() });
}

async function arcgis<T>(
  endpoint: string,
  parameters: Record<string, string>,
  schema: z.ZodType<T>,
  fetchPublisher: typeof fetch,
  method: "GET" | "POST" = "GET",
) {
  const fields = new URLSearchParams({ f: "json", ...parameters });
  const response = await fetchPublisher(method === "GET" ? `${endpoint}?${fields}` : endpoint, {
    method,
    ...(method === "POST" && { body: fields }),
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Boston GIS request failed.");
  return schema.parse(await response.json());
}

function parcelAddresses(records: z.infer<typeof assessment>[]) {
  const candidates = new Map<string, { parcelId: string; addresses: string[] }>();
  for (const { attributes: a } of records) {
    if (!a.map_par_id || !parcelId.safeParse(a.map_par_id).success) continue;
    const parcel = candidates.get(a.map_par_id) ?? { parcelId: a.map_par_id, addresses: [] };
    const number = a.st_num2 == null ? a.st_num : `${a.st_num}-${a.st_num2}`;
    const street = [number, a.st_name].filter(Boolean).join(" ");
    const locality = [a.city, "MA", a.zip_code].filter(Boolean).join(" ");
    const address = street ? `${street}, ${locality}` : null;
    if (address && !parcel.addresses.includes(address)) parcel.addresses.push(address);
    candidates.set(parcel.parcelId, parcel);
  }
  return [...candidates.values()];
}

function extentOf(rings: z.infer<typeof ring>[]) {
  let xmin = Infinity;
  let ymin = Infinity;
  let xmax = -Infinity;
  let ymax = -Infinity;
  for (const points of rings) {
    for (const [x, y] of points) {
      xmin = Math.min(xmin, x);
      ymin = Math.min(ymin, y);
      xmax = Math.max(xmax, x);
      ymax = Math.max(ymax, y);
    }
  }
  return [xmin - 1, ymin - 1, xmax + 1, ymax + 1].join(",");
}

const overlayCodeNodes: Readonly<Record<number, string>> = {
  1: "ART25ACOFLREOVDI",
  2: "ART32GRCOOVDI",
  3: "ART29GRPROVDI",
  14: "ART49AGROVDI",
  19: "ART87SMGROVDI",
};
const assessmentResults = featureSet(assessment);
const parcelResults = featureSet(parcelFeature);
const zoningResults = featureSet(subdistrictFeature);
const overlayResults = z.object({ results: z.array(overlayMatch), exceededTransferLimit: z.boolean().optional() });

export async function lookupParcelZoning(input: z.infer<typeof inputSchema>, fetchPublisher = fetch) {
  const where = assessmentFilter(input);
  if (!where) {
    return { status: "invalid_address", message: "Provide a street number and street name, or a 10-digit Boston parcel ID.", sources };
  }

  const assessmentQuery = await arcgis(`${assessing}/query`, {
    where,
    outFields: "map_par_id,st_num,st_num2,st_name,city,zip_code",
    returnGeometry: "false",
    returnDistinctValues: "true",
    orderByFields: "map_par_id",
    resultRecordCount: "25",
  }, assessmentResults, fetchPublisher).catch(() => null);
  if (!assessmentQuery) {
    return { status: "unavailable", message: "Boston Assessing did not return usable parcel matches.", sources };
  }

  const candidates = parcelAddresses(assessmentQuery.features);
  const [parcel] = candidates;
  if (assessmentQuery.exceededTransferLimit || candidates.length > 1) {
    return {
      status: "ambiguous_address",
      candidates,
      moreResults: assessmentQuery.exceededTransferLimit === true,
      message: "Select the correct parcel ID or add the ZIP code and retry.",
      sources,
    };
  }
  if (!parcel || assessmentQuery.features.some(({ attributes }) => attributes.map_par_id !== parcel.parcelId)) {
    const matched = assessmentQuery.features.length > 0;
    return {
      status: matched ? "partial" : "no_match",
      candidates,
      message: matched
        ? "An Assessing match has no usable mapped parcel ID. Check the Boston Zoning Viewer."
        : "Boston Assessing returned no match. Check the street spelling or try a parcel ID.",
      sources,
    };
  }

  const parcelLookup = await arcgis(`${parcels}/query`, {
    where: `map_par_id = ${quoted(parcel.parcelId)}`,
    outFields: "map_par_id",
    returnGeometry: "true",
    outSR: "2249",
    resultRecordCount: "2",
  }, parcelResults, fetchPublisher).catch(() => null);
  if (!parcelLookup || parcelLookup.exceededTransferLimit || parcelLookup.features.length !== 1) {
    return { status: "partial", parcel, message: "The city did not return one usable boundary for this parcel.", sources };
  }
  const rings = parcelLookup.features[0]!.geometry.rings;
  const spatialQuery = {
    geometry: JSON.stringify({ rings, spatialReference: { wkid: 2249 } }),
    geometryType: "esriGeometryPolygon",
    returnGeometry: "false",
  };

  const [zoning, overlay] = await Promise.all([
    arcgis(`${subdistricts}/query`, {
      ...spatialQuery,
      inSR: "2249",
      spatialRel: "esriSpatialRelRelation",
      relationParam: "T********",
      outFields: "Zoning_District,Zoning_Subdistrict,Article,Map_Number",
      resultRecordCount: "50",
    }, zoningResults, fetchPublisher, "POST").catch(() => null),
    arcgis(`${overlays}/identify`, {
      ...spatialQuery,
      sr: "2249",
      mapExtent: extentOf(rings),
      imageDisplay: "400,400,96",
      tolerance: "0",
      layers: "all",
      returnUnformattedValues: "true",
    }, overlayResults, fetchPublisher, "POST").catch(() => null),
  ]);
  const districts = new Map<string, {
    district: string | null; subdistrict: string | null; article: string | null; mapNumber: string | null;
    articleUrl: string | null; tablesUrl: string | null;
  }>();
  for (const { attributes: a } of zoning?.features ?? []) {
    if (!a.Zoning_District && !a.Zoning_Subdistrict) continue;
    const district = {
      district: a.Zoning_District,
      subdistrict: a.Zoning_Subdistrict,
      article: a.Article,
      mapNumber: a.Map_Number,
      ...zoningCodeLinks(a.Article, a.Zoning_Subdistrict ?? ""),
    };
    districts.set(JSON.stringify(district), district);
  }

  const intersections = new Map<string, { name: string; featureName: string | null; layerUrl: string; codeUrl: string | null }>();
  for (const feature of overlay?.results ?? []) {
    const node = overlayCodeNodes[feature.layerId];
    const featureName = typeof feature.value === "string" && /\p{L}/u.test(feature.value)
      && feature.value !== feature.layerName ? feature.value : null;
    const item = {
      name: feature.layerName,
      featureName,
      layerUrl: `${overlays}/${feature.layerId}`,
      codeUrl: node ? `${bostonZoningCode}?nodeId=${node}` : null,
    };
    intersections.set(JSON.stringify(item), item);
  }

  const issues = [];
  if (!zoning || zoning.exceededTransferLimit || districts.size === 0) {
    issues.push("The zoning layer did not return a complete district match.");
  }
  if (!overlay || overlay.exceededTransferLimit) {
    issues.push("The overlay layer did not return complete results.");
  }
  return {
    status: issues.length ? "partial" : districts.size > 1 ? "multiple_zones" : "matched",
    parcel,
    districts: [...districts.values()],
    possibleOverlayIntersections: overlay ? [...intersections.values()] : null,
    issues,
    retrievedAt: new Date().toISOString(),
    guidance: "Use the linked article and the subdistrict column of its dimensional tables. Check overlay boundaries and the work location against Boston’s signed zoning maps.",
    sources,
  };
}

export const resolveParcelZoning = createTool({
  id: "resolve_parcel_zoning",
  description: "Match a Boston street address or parcel ID to the city’s parcel and zoning layers. Returns districts, subdistricts, possible overlay intersections, and links to dimensional tables where available.",
  inputSchema,
  execute: (input) => lookupParcelZoning(input),
});
