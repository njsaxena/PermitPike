import { complianceSources } from "@permitpike/compliance/catalog";
import { z } from "zod";
import type { ArchiveChatInput, ArchiveDocument, ArchiveRecord, ArchiveSearchResult } from "../archive";

const DATASTORE = "https://data.boston.gov/api/3/action/datastore_search";
const DATASTORE_SQL = `${DATASTORE}_sql`;
const RESOURCE_ID = "6ddcd912-32a0-43df-9908-63574f8c7e77";
const SOURCE_FIELDS = "permitnumber,worktype,permittypedescr,description,issued_date,status,address,zip,parcel_id";
const RESULT_LIMIT = 10;
const EXACT_LIMIT = 10;
const PERMIT_ID = /^[A-Z]{1,5}-?\d{4,10}(?:-[A-Z0-9]{1,4})?$/u;
const NUMERIC_ID = /^\d{3,10}$/u;

type Topic = { id: string; title: string; pattern: RegExp; terms: string[] };
type Neighborhood = [name: string, pattern: RegExp, cities: string[], zips?: string[]];
type Address = { house: string | null; name: string; suffix: string };
type DateBounds = [start: number | null, end: number | null];
type SearchDocument = ArchiveDocument & { topics: string[] };
type SearchOptions = Partial<Pick<ArchiveChatInput, "history" | "recordContext">> & { fetcher?: typeof fetch };
type SearchHistory = NonNullable<ArchiveChatInput["history"]>;
type SearchPlan = {
  query: string;
  ids: string[];
  addresses: Address[];
  neighborhood?: Neighborhood;
  zip?: string;
  topics: Topic[];
  dates: DateBounds | null;
  status?: string;
  documentTopics: string[];
  preferDocuments: boolean;
  oldest: boolean;
  compare: boolean;
  exactContext?: boolean;
};

const TOPICS: Topic[] = [
  { id: "ev", title: "EV chargers", pattern: /\b(?:ev|evse|electric vehicle|car charg\w*|charging station)\b/u, terms: ["ev charger", "ev charging", "electric vehicle", "evse", "charging station"] },
  { id: "solar", title: "solar installations", pattern: /\b(?:solar|photovoltaic|pv)\b/u, terms: ["solar", "photovoltaic", "pv system"] },
  { id: "panel", title: "electrical panel and service upgrades", pattern: /\b(?:electrical service|service (?:upgrade|change|panel)|breaker|panel(?:s| upgrade)?|amp service)\b/u, terms: ["panel upgrade", "panel replacement", "electrical panel", "service upgrade", "amp service", "replace panel", "service change"] },
  { id: "heat-pump", title: "heat pumps", pattern: /\b(?:heat[ -]?pumps?|mini[ -]?splits?|ductless)\b/u, terms: ["heat pump", "heat-pump", "mini split", "mini-split", "ductless"] },
  { id: "battery", title: "battery storage", pattern: /\b(?:batter(?:y|ies)|energy storage|bess|powerwall)\b/u, terms: ["battery storage", "energy storage", "powerwall", "backup battery", "bess", "battery backup"] },
  { id: "electrical", title: "electrical work", pattern: /\b(?:electrical|wiring|rewir\w*|electrician)\b/u, terms: ["electrical", "wiring"] },
  { id: "plumbing", title: "plumbing", pattern: /\b(?:plumb\w*|water heater)\b/u, terms: ["plumbing", "water heater"] },
  { id: "hvac", title: "heating and cooling", pattern: /\b(?:hvac|furnace|boiler|air conditioning|air conditioner|heating)\b/u, terms: ["hvac", "furnace", "boiler", "air conditioning", "air conditioner", "heating"] },
  { id: "demolition", title: "demolition", pattern: /\b(?:demolition|demolish\w*|teardown)\b/u, terms: ["demoli", "tear down", "teardown"] },
  { id: "construction", title: "new construction", pattern: /\b(?:new (?:construction|buildings?|builds?|homes?)|ground[ -]up)\b/u, terms: ["erect/new construction", "new construction", "new building"] },
  { id: "renovation", title: "renovations", pattern: /\b(?:renovat\w*|remodel\w*|alterations?)\b/u, terms: ["renovat", "remodel", "long form/alteration"] },
  { id: "roof", title: "roofing", pattern: /\b(?:roo(?:f|fs|fing)|reroof|re-roof|shingl\w*)\b/u, terms: ["roof", "shingl"] },
  { id: "occupancy", title: "certificates of occupancy", pattern: /\b(?:certificate[s]? of occupancy|occupancy certificate[s]?|coo)\b/u, terms: ["certificate of occupancy"] },
  { id: "sprinkler", title: "fire protection", pattern: /\b(?:fire alarm[s]?|fire protection|sprinkler[s]?)\b/u, terms: ["fire alarm", "fire protection", "sprinkler"] },
];

const NEIGHBORHOODS: Neighborhood[] = [
  ["West Roxbury", /\bwest roxbury\b/u, ["West Roxbury"]],
  ["East Boston", /\b(?:east boston|eastie)\b/u, ["East Boston"]],
  ["South Boston", /\b(?:south boston|southie)\b/u, ["South Boston", "South Boston/"]],
  ["Jamaica Plain", /\b(?:jamaica plain|jp)\b/u, ["Jamaica Plain"]],
  ["Hyde Park", /\bhyde park\b/u, ["Hyde Park"]],
  ["Mission Hill", /\bmission hill\b/u, ["Mission Hill"]],
  ["Dorchester", /\b(?:dorchester(?: center)?|dot)\b/u, ["Dorchester", "Dorchester Center"]],
  ["Roxbury", /\broxbury\b/u, ["Roxbury", "Roxbury Crossing"]],
  ["Roslindale", /\b(?:roslindale|rozzie)\b/u, ["Roslindale"]],
  ["Mattapan", /\bmattapan\b/u, ["Mattapan"]],
  ["Allston", /\ballston\b/u, ["Allston"]],
  ["Brighton", /\bbrighton\b/u, ["Brighton"]],
  ["Charlestown", /\bcharlestown\b/u, ["Charlestown", "Charlestown/"]],
  ["Chestnut Hill", /\bchestnut hill\b/u, ["Chestnut Hill"]],
  ["Back Bay", /\bback bay\b/u, ["Back Bay", "Boston/Back Bay"], ["02116", "02199"]],
  ["South End", /\bsouth end\b/u, ["South End", "Boston/South End"], ["02118"]],
  ["North End", /\bnorth end\b/u, ["North End", "Boston/North End"], ["02113"]],
  ["West End", /\bwest end\b/u, ["West End", "Boston/West End"], ["02114"]],
  ["Beacon Hill", /\bbeacon hill\b/u, ["Beacon Hill"], ["02108", "02114"]],
  ["Fenway", /\b(?:fenway|kenmore)\b/u, ["Fenway", "Fenway/Kenmore"], ["02215"]],
  ["Downtown", /\b(?:downtown|financial district)\b/u, ["Downtown/Financial District", "Financial District"], ["02108", "02109", "02110", "02111"]],
  ["Seaport", /\b(?:seaport|fort point)\b/u, ["Seaport", "Boston/Waterfront"], ["02210"]],
];

const PDF_TOPICS = new Map<string, string[]>([
  ["boston-evse-bulletin", ["ev"]],
  ["boston-evse-installation-guide", ["ev"]],
  ["ma-electrical-code", ["ev", "electrical", "solar", "panel", "battery"]],
  ["boston-noise-regulations", ["heat-pump", "hvac", "noise"]],
  ["boston-battery-zoning", ["battery", "zoning"]],
  ["ma-fire-code", ["battery", "sprinkler", "fire-code"]],
]);

const DOCUMENTS: SearchDocument[] = [
  ...complianceSources.flatMap(({ id, title, scope, url, citation }) => {
    const topics = PDF_TOPICS.get(id);
    return topics ? [{ id, title, description: scope, url, source: citation, topics, fileType: "PDF" as const }] : [];
  }),
  {
    id: "boston-archive-guide", title: "Boston public records search guide",
    description: "City instructions for searching the ScerIS archive, opening an individual scan and exporting it as a PDF.",
    url: "https://scerisecm.boston.gov/ScerIS/cmpublic/ScerISDocs/City%20Of%20Boston%20Public%20Search%20Guide.pdf", source: "City of Boston", topics: ["archive"], fileType: "PDF",
  },
  {
    id: "boston-electrical-application", title: "Boston electrical permit application and requirements",
    description: "The City explains eligibility, supporting documents, fees, and how to apply through the online permitting portal.",
    url: "https://www.boston.gov/permitting/permits/electrical-permit", source: "Boston Inspectional Services", topics: ["electrical-forms"], fileType: "Web",
  },
  {
    id: "boston-permitting-guide", title: "Navigating the Boston permit process",
    description: "An Inspectional Services guide to building, electrical, and mechanical permit applications.",
    url: "https://content.boston.gov/sites/default/files/file/2024/02/ISD_Navigating%20the%20Permit%20Process%20Eng.pdf", source: "Boston Inspectional Services", topics: ["electrical-forms"], fileType: "PDF",
  },
];

const STREET_SUFFIXES = {
  street: ["st", "street"], avenue: ["ave", "av", "avenue"], road: ["rd", "road"],
  boulevard: ["blvd", "bl", "boulevard"], place: ["pl", "place"], court: ["ct", "court"],
  drive: ["dr", "drive"], terrace: ["ter", "terrace"], lane: ["ln", "lane"],
  way: ["way"], parkway: ["pkwy", "parkway"], circle: ["cir", "circle"],
  square: ["sq", "square"], highway: ["hwy", "highway"], trail: ["trl", "trail"],
};
const suffixes = new Map<string, string[]>(Object.values(STREET_SUFFIXES).flatMap((variants) => variants.map((suffix) => [suffix, variants] as const)));
const SUFFIX = `(?:${[...suffixes.keys()].sort((a, b) => b.length - a.length).join("|")})`;
const STREET_WORD = "[a-z][a-z0-9'-]*";
const NUMBERED_ADDRESS = new RegExp(`\\b(\\d{1,5}[a-z]?(?:-\\d{1,5}[a-z]?)?)\\s+(${STREET_WORD}(?:\\s+${STREET_WORD}){0,5}?)\\s+(${SUFFIX})\\b`, "gu");
const STREET_ONLY = new RegExp(`\\b(${STREET_WORD}(?:\\s+${STREET_WORD}){0,5}?)\\s+(${SUFFIX})\\b`, "gu");
const ADDRESS_WORD_LIMIT = /\b(?:at|on|near|of|around|along|for|from|in|and|or|versus|vs|show|find|permits?|records?|scans?|compare)\s+/gu;
const OUT_OF_SCOPE = /\b(?:birth certificates?|death certificates?|marriage (?:records?|licenses?|certificates?)|police (?:reports?|records?)|deeds?|court records?|fire incident reports?|tax returns?|vital records?)\b/u;
const DOCUMENT_REQUEST = /\b(?:guides?|forms?|applications?|checklists?|requirements?|regulations?|zoning|bylaws?|ordinances?|code amendments?|electrical code|fire code|how (?:to|do i)|what (?:do i need|are the rules))\b/u;
const FOLLOW_UP = /^(?:only|just|instead|and |also |but |what about|how about|now |narrow|filter|in |since |before |after |between )|\b(?:ones|those|these|them|previous results)\b/u;
const REFERENTIAL = /\b(?:ones|those|these|them|previous results|compare|same)\b/u;
const PROMPTS = ["Find permits at 99 High Street", "EV chargers in Dorchester since 2023", "Look up A993149 and A1000569"];

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function validId(value: string): boolean {
  return PERMIT_ID.test(value) || NUMERIC_ID.test(value);
}

function normalize(query: string): string {
  return query.toLowerCase().replace(/[‘’]/gu, "'").replace(/[–—]/gu, "-").replace(/\./gu, " ").replace(/\s+/gu, " ").trim();
}

function extractAddresses(query: string): Address[] {
  const matches: Address[] = [];
  for (const [, house, name, suffix] of query.matchAll(NUMBERED_ADDRESS)) {
    if (!house || !name || !suffix || /\b(?:and|or|at|on|near|from|between|with)\b/u.test(name)) continue;
    matches.push({ house, name, suffix });
  }
  if (matches.length) return matches.slice(0, 3);
  for (const [, phrase, suffix] of query.matchAll(STREET_ONLY)) {
    const name = phrase?.split(ADDRESS_WORD_LIMIT).at(-1)?.trim();
    if (name && suffix && !/\b(?:any|this|that|the|another|which|city|what|apt|power)\b/u.test(name)) {
      matches.push({ house: null, name, suffix });
    }
  }
  return matches.slice(0, 3);
}

function dateBounds(query: string): DateBounds | null {
  const years = [...query.matchAll(/\b(?:18|19|20)\d{2}(?:s\b|\b)/gu)].map(([year]) => Number.parseInt(year, 10));
  const [first] = years;
  const now = new Date().getUTCFullYear();
  if (/\blast year\b/u.test(query)) return [now - 1, now];
  if (/\bthis year\b/u.test(query)) return [now, now + 1];
  if (!first) return null;
  const second = years[1] ?? first;
  if (/\b(?:before|earlier than|prior to)\b/u.test(query)) return [null, first];
  if (/\b(?:after|later than)\b/u.test(query)) return [first + 1, null];
  if (/\b(?:since|onward)\b/u.test(query)) return [first, null];
  if (query.includes(`${first}s`)) return [first, first + 10];
  return [Math.min(first, second), Math.max(first, second) + 1];
}

function parsePlan(rawQuery: string): SearchPlan {
  const query = normalize(rawQuery);
  const prefixedIds = rawQuery.toUpperCase().split(/[^A-Z0-9-]+/u).filter((word) => PERMIT_ID.test(word));
  const numericIds = [...query.matchAll(/\bpermit\s*(?:number\s*#?|no\s*#?|#)\s*(\d{3,10})\b/gu)].flatMap(([, id]) => id ? [id] : []);
  const ids = unique([...prefixedIds, ...numericIds]).slice(0, EXACT_LIMIT);
  const addresses = extractAddresses(query);
  let location = query;
  for (const id of numericIds) location = location.replace(new RegExp(`\\b${id}\\b`, "u"), " ");
  for (const { house, name, suffix } of addresses) location = location.replace([house, name, suffix].filter(Boolean).join(" "), " ");
  const neighborhood = NEIGHBORHOODS.find(([, pattern]) => pattern.test(location));
  const zip = location.match(/\b(?:021\d{2}|022\d{2}|02467)\b/u)?.[0];
  let topics = TOPICS.filter(({ pattern }) => pattern.test(location));
  if (topics.some(({ id }) => ["ev", "panel", "solar", "battery"].includes(id))) topics = topics.filter(({ id }) => id !== "electrical");
  if (topics.some(({ id }) => id === "heat-pump")) topics = topics.filter(({ id }) => id !== "hvac");
  const status = query.match(/\b(open|closed) (?:ones|permits|records|results)\b|\b(?:are|were|only|status)\s+(open|closed)\b/u);
  const documentTopics = [
    ...topics.map(({ id }) => id),
    ...(/\bnoise\b/u.test(query) ? ["noise"] : []),
    ...(/\b(?:zoning|article 88)\b/u.test(query) ? ["zoning"] : []),
    ...(/\b(?:electrical code|527 cmr 12)\b/u.test(query) ? ["electrical"] : []),
    ...(/\b(?:fire code|527 cmr 1)\b/u.test(query) ? ["fire-code"] : []),
    ...(/\belectrical\b/u.test(query) && /\b(?:forms?|applications?|how (?:to|do i) apply)\b/u.test(query) ? ["electrical-forms"] : []),
    ...(/\b(?:sceris|historical permits?|archive (?:search|guide)|(?:how|where) (?:to|do i).*(?:scans?|permit records?))\b/u.test(query) ? ["archive"] : []),
  ];
  return {
    query, ids, addresses, neighborhood, zip, topics, dates: dateBounds(location), status: status?.[1] ?? status?.[2], documentTopics,
    preferDocuments: DOCUMENT_REQUEST.test(query), oldest: /\b(?:oldest|earliest)\b/u.test(query),
    compare: /\b(?:compare|comparison|versus|vs|difference[s]?)\b/u.test(query),
  };
}

function reusePlan(current: SearchPlan, previous: SearchPlan | undefined, recordContext: string[]): SearchPlan {
  if (current.ids.length || !FOLLOW_UP.test(current.query) && !REFERENTIAL.test(current.query) && !/^\d{4}$/u.test(current.query)) return current;
  const contextualIds = recordContext.filter((id) => typeof id === "string").map((id) => id.toUpperCase()).filter(validId);
  const hasFreshAnchor = current.addresses.length || current.neighborhood || current.zip || current.topics.length;
  if (contextualIds.length && REFERENTIAL.test(current.query) && !hasFreshAnchor) {
    return { ...current, ids: unique(contextualIds).slice(0, EXACT_LIMIT), exactContext: true };
  }
  if (!previous) return current;
  const hasNewLocation = current.addresses.length || current.neighborhood || current.zip;
  return {
    ...current,
    ids: hasFreshAnchor ? [] : previous.ids,
    addresses: hasNewLocation ? current.addresses : previous.addresses,
    neighborhood: hasNewLocation ? current.neighborhood : previous.neighborhood,
    zip: hasNewLocation ? current.zip : previous.zip,
    topics: current.topics.length ? current.topics : previous.topics,
    dates: current.dates || previous.dates,
    status: current.status || previous.status,
    documentTopics: current.documentTopics.length ? current.documentTopics : previous.documentTopics,
  };
}

function planFromHistory(query: string, history: SearchHistory, context: string[]): SearchPlan {
  const recent = history.filter((entry) => entry?.role === "user" && typeof entry.content === "string").slice(-6);
  let previous: SearchPlan | undefined;
  for (const { content } of recent) previous = reusePlan(parsePlan(content.slice(0, 800)), previous, []);
  return reusePlan(parsePlan(query), previous, context);
}

// Only literals enter the SQL from the parser. The table, columns, and SQL structure are fixed.
function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlList(values: string[]): string {
  return values.map(sqlString).join(", ");
}

function addressCondition({ house, name, suffix }: Address): string {
  const variants = suffixes.get(suffix) ?? [suffix];
  return `(${variants.map((variant) => {
    const candidate = [house, name, variant].filter(Boolean).join(" ");
    return `strpos(' ' || lower(address) || ' ', ${sqlString(` ${candidate} `)}) > 0`;
  }).join(" OR ")})`;
}

function topicCondition(topic: Topic): string {
  return `(${topic.terms.map((term) => `strpos(lower(description || ' ' || permittypedescr), ${sqlString(term)}) > 0 OR strpos(lower(comments), ${sqlString(term)}) > 0`).join(" OR ")})`;
}

function buildSearch(plan: SearchPlan, limit: number): URL {
  const constraints = [];
  if (plan.ids.length) constraints.push(`permitnumber IN (${sqlList(plan.ids)})`);
  if (plan.addresses.length) constraints.push(`(${plan.addresses.map(addressCondition).join(" OR ")})`);
  if (plan.zip) constraints.push(`zip = ${sqlString(plan.zip)}`);
  if (plan.neighborhood) {
    const [, , cities, zips] = plan.neighborhood;
    const citiesMatch = `lower(city) IN (${sqlList(cities.map((value) => value.toLowerCase()))})`;
    constraints.push(zips && !plan.zip ? `(${citiesMatch} OR zip IN (${sqlList(zips)}))` : citiesMatch);
  }
  if (plan.topics.length) constraints.push(`(${plan.topics.map(topicCondition).join(" OR ")})`);
  if (plan.dates?.[0]) constraints.push(`issued_date >= '${plan.dates[0]}-01-01'`);
  if (plan.dates?.[1]) constraints.push(`issued_date < '${plan.dates[1]}-01-01'`);
  if (plan.status) constraints.push(`lower(status) = ${sqlString(plan.status)}`);
  const url = new URL(DATASTORE_SQL);
  url.searchParams.set("sql", `SELECT ${SOURCE_FIELDS}, left(comments, 2500) AS comments FROM "${RESOURCE_ID}" WHERE ${constraints.join(" AND ")} ORDER BY issued_date ${plan.oldest ? "ASC" : "DESC"} NULLS LAST, permitnumber ASC LIMIT ${limit}`);
  return url;
}

function sourceUrl(permitNumber: string): string {
  const source = new URL(DATASTORE);
  source.searchParams.set("resource_id", RESOURCE_ID);
  source.searchParams.set("filters", JSON.stringify({ permitnumber: permitNumber }));
  source.searchParams.set("fields", `${SOURCE_FIELDS},comments`);
  return source.href;
}

function textValue(value: unknown, limit = 320): string | null {
  return typeof value === "string" || typeof value === "number" ? String(value).trim().slice(0, limit) || null : null;
}

function excerpt(comments: unknown, topics: Topic[]): string | null {
  if (typeof comments !== "string") return null;
  const note = comments.replace(/\s+/gu, " ").trim()
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/giu, "[email removed]")
    .replace(/(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b/gu, "[phone removed]");
  if (!note) return null;
  if (note.length <= 420) return note;
  const lowerNote = note.toLowerCase();
  const hit = topics.flatMap(({ terms }) => terms.map((term) => lowerNote.indexOf(term))).find((index) => index >= 0) ?? 0;
  const start = hit >= 340 ? Math.max(0, note.lastIndexOf(" ", hit - 85) + 1) : 0;
  const end = note.length - start > 420 ? Math.max(start + 400, note.lastIndexOf(" ", start + 420)) : note.length;
  return `${start ? "…" : ""}${note.slice(start, end)}${end < note.length ? "…" : ""}`;
}

function mapRecord(value: unknown, plan: SearchPlan): ArchiveRecord | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const permitNumber = textValue(raw.permitnumber);
  if (!permitNumber || !validId(permitNumber)) return null;
  return {
    permitNumber,
    workType: textValue(raw.worktype),
    permitType: textValue(raw.permittypedescr),
    description: textValue(raw.description, 1400),
    details: excerpt(raw.comments, plan.topics),
    issuedDate: textValue(raw.issued_date),
    status: textValue(raw.status),
    address: textValue(raw.address),
    zip: textValue(raw.zip),
    parcelId: textValue(raw.parcel_id),
    sourceUrl: sourceUrl(permitNumber),
  };
}

const CkanResponse = z.object({ success: z.literal(true), result: z.object({ records: z.array(z.unknown()) }) });

async function fetchResults(plan: SearchPlan, fetcher: typeof fetch, limit: number): Promise<ArchiveRecord[]> {
  const response = await fetcher(buildSearch(plan, limit), { cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(8_000) });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("Boston records are unavailable");
  }
  const payload = CkanResponse.parse(await response.json());
  return payload.result.records.slice(0, limit).map((raw) => mapRecord(raw, plan)).filter((record) => record !== null);
}

async function matchingRecords(plan: SearchPlan, fetcher: typeof fetch): Promise<ArchiveRecord[]> {
  if (plan.ids.length) return fetchResults(plan, fetcher, RESULT_LIMIT);
  const searches = plan.addresses.length > 1 ? plan.addresses.map((address) => ({ ...plan, addresses: [address] }))
    : plan.topics.length > 1 ? plan.topics.slice(0, 3).map((topic) => ({ ...plan, topics: [topic] })) : [plan];
  const grouped = await Promise.all(searches.map((search) => fetchResults(search, fetcher, Math.floor(RESULT_LIMIT / searches.length))));
  return grouped.flat();
}

function recordReply(records: ArchiveRecord[], plan: SearchPlan): string {
  const count = records.length;
  const unit = count === 1 ? "issued-permit record" : "issued-permit records";
  if (plan.ids.length) {
    const missing = plan.ids.filter((id) => !records.some(({ permitNumber }) => permitNumber === id));
    const remaining = missing.length ? ` No matching issued-permit record for ${missing.join(", ")}${plan.exactContext ? " under this filter" : ""}.` : "";
    if (plan.compare && count > 1) {
      const comparisons = records.slice(0, 4).map((record) => `${record.permitNumber} (${[record.permitType || record.description, record.issuedDate?.slice(0, 10), record.address].filter(Boolean).join(", ")})`);
      return `Here are ${count} ${unit} to compare. ${comparisons.join(". ")}.${remaining}`;
    }
    return `I found ${count} ${unit} in Boston’s public data.${remaining}`;
  }
  const topic = plan.topics.map(({ title }) => title).join(" or ");
  const location = plan.addresses.length ? ` at ${plan.addresses.map(({ house, name, suffix }) => [house, name, suffix].filter(Boolean).join(" ").replace(/\b[a-z]/gu, (letter) => letter.toUpperCase())).join(" and ")}`
    : plan.zip ? ` in ZIP ${plan.zip}` : plan.neighborhood ? ` near ${plan.neighborhood[0]}` : " in Boston";
  const [start, end] = plan.dates ?? [];
  const dates = start && end ? start === end - 1 ? ` from ${start}` : ` from ${start} through ${end - 1}`
    : start ? ` issued since ${start}` : end ? ` issued before ${end}` : "";
  const areaNote = plan.neighborhood?.[3] && !plan.zip ? " The city or ZIP fields provide an approximate neighborhood match." : "";
  return `Here ${count === 1 ? "is" : "are"} ${count} matching ${unit}${topic ? ` for ${topic}` : ""}${location}${dates}.${areaNote}`;
}

export async function searchArchive(
  query: string,
  { history = [], recordContext = [], fetcher = fetch }: SearchOptions = {},
): Promise<ArchiveSearchResult> {
  const current = query.trim().slice(0, 800);
  const plan = planFromHistory(current, history, recordContext);
  const hasSearch = plan.ids.length || plan.addresses.length || plan.topics.length || plan.neighborhood || plan.zip;
  const documents = DOCUMENTS.filter((item) => item.topics.some((topic) => plan.documentTopics.includes(topic)))
    .map(({ topics, ...document }) => document);
  const result = (status: ArchiveSearchResult["status"], answer: string, records: ArchiveRecord[] = [], suggestions = PROMPTS): ArchiveSearchResult => ({
    status, answer, records, documents, suggestions,
    scanPermitNumbers: plan.exactContext ? [] : plan.ids.filter((number) => !records.some((record) => record.permitNumber === number)),
  });
  if (OUT_OF_SCOPE.test(plan.query) && !plan.ids.length) {
    return result("clarify", "This search covers Boston’s issued permits and selected public guides. Which building permit, address, or type of work should I look for?");
  }
  if ((plan.preferDocuments || !hasSearch) && documents.length && !plan.addresses.length && !plan.ids.length && !plan.neighborhood && !plan.zip && !plan.dates) {
    if (plan.documentTopics.includes("electrical-forms")) {
      return result("results", "Boston accepts electrical permit applications through its online permitting portal. Here are the official application instructions and related documents.");
    }
    return result("results", "I found these official reference PDFs. You can also search for issued permits by adding an address, neighborhood, or year.");
  }
  if (!hasSearch) {
    return result("clarify", "What should I look for in Boston’s permit records? An address, street, neighborhood, permit number, or a clue about the work is enough to start.");
  }
  try {
    const fetched = await matchingRecords(plan, fetcher);
    const matches = plan.ids.length ? fetched.filter(({ permitNumber }) => plan.ids.includes(permitNumber)) : fetched;
    const records = [...new Map(matches.map((record) => [record.permitNumber, record])).values()];
    if (plan.ids.length) records.sort((a, b) => plan.ids.indexOf(a.permitNumber) - plan.ids.indexOf(b.permitNumber));
    if (!records.length) {
      const help = plan.ids.length ? "Check the permit number or try its street address. Older original scans may be listed in the City’s ScerIS portal."
        : "Try a nearby street, a ZIP code, or a wider date range. Older original scans may be listed in the City’s ScerIS portal.";
      return result(documents.length ? "results" : "not_found", `I found no matching issued-permit entries. ${help}${documents.length ? " Related reference PDFs are below." : ""}`);
    }
    const firstRecord = records[0];
    const year = firstRecord?.issuedDate?.match(/^\d{4}(?=-)/u)?.[0];
    const suggestions = [
      ...(records.length > 1 ? ["Compare these results"] : []),
      ...(!plan.dates && year ? [`Only ${year}`] : []),
      ...(!plan.ids.length && firstRecord ? [`Look up ${firstRecord.permitNumber}`] : []),
    ];
    return result("results", recordReply(records, plan), records, suggestions);
  } catch {
    const guides = documents.length ? " Available City and state reference PDFs are below." : "";
    return result(documents.length ? "results" : "unavailable", `Boston’s issued-permit data could not be reached. Try the search again.${guides}`);
  }
}
