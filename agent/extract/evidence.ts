import {
  Confidence,
  EvChargerFields,
  Extraction,
  HeatPumpPanelFields,
  HomeBatteryFields,
  JobType,
  ServiceFields,
} from "@permitpike/contract";
import { z } from "zod";

export const ExtractionJob = z.enum([...JobType.options, "heat_pump", "panel"]);
export type ExtractionJob = z.infer<typeof ExtractionJob>;

const readingDetails = {
  unit: z.string().nullable(),
  confidence: Confidence,
  source: z.string(),
};

export const FieldReading = z.strictObject({
  value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
  ...readingDetails,
});
export type FieldReading = z.infer<typeof FieldReading>;

export const Evidence = z.record(z.string(), FieldReading);
export type Evidence = z.infer<typeof Evidence>;

export const CONFIRM_BELOW = 0.7;
export const CRITICAL_FIELDS = [
  "heatPump.mcaAmps",
  "heatPump.mocpAmps",
  "mainBreakerAmps",
  "proposedBreakerAmps",
  "backfeedBreakerAmps",
] as const;

const missingReading = Object.freeze({ value: null, unit: null, confidence: 0, source: "not found" });

const unitFactors = {
  A: { a: 1, amp: 1, amps: 1, ampere: 1, amperes: 1 },
  V: { v: 1, volt: 1, volts: 1, vac: 1, vdc: 1 },
  W: { w: 1, watt: 1, watts: 1, kw: 1000, kilowatt: 1000, kilowatts: 1000 },
  kW: { kw: 1, kilowatt: 1, kilowatts: 1, w: 0.001, watt: 0.001, watts: 0.001 },
  kWh: { kwh: 1, kilowatthour: 1, kilowatthours: 1, wh: 0.001 },
  VA: { va: 1, voltampere: 1, voltamperes: 1, kva: 1000 },
  "BTU/h": {
    "btu/h": 1, "btu/hr": 1, btuh: 1, btuperhour: 1, ton: 12000, tons: 12000, tr: 12000,
  },
  "ft²": { ft2: 1, sqft: 1, squarefoot: 1, squarefeet: 1 },
  ft: { ft: 1, foot: 1, feet: 1, "'": 1, "′": 1, in: 1 / 12, inch: 1 / 12, inches: 1 / 12 },
  in: { in: 1, inch: 1, inches: 1, '"': 1, "″": 1, ft: 12, foot: 12, feet: 12 },
  count: { count: 1, circuits: 1, spaces: 1, slots: 1 },
} satisfies Record<string, Record<string, number>>;

type Unit = keyof typeof unitFactors;

const unitBySuffix: ReadonlyArray<readonly [RegExp, Unit]> = [
  [/[Aa]mps$/, "A"],
  [/[Vv]oltage$/, "V"],
  [/BTU$/, "BTU/h"],
  [/KWh$/, "kWh"],
  [/KW$/, "kW"],
  [/VA$/, "VA"],
  [/W$/, "W"],
  [/SqFt$/, "ft²"],
  [/Ft$/, "ft"],
  [/In$/, "in"],
  [/(?:Spaces|Circuits)$/, "count"],
];

function leafSchemas(schema: z.ZodType, path: string): Array<readonly [string, z.ZodType]> {
  const base = schema instanceof z.ZodNullable ? schema.unwrap() as z.ZodType : schema;
  if (!(base instanceof z.ZodObject)) return [[path, base]];

  const entries = Object.entries<z.ZodType>(base.shape);
  return entries.flatMap(([key, child]) => {
    if (key === "jobType") return [];
    return leafSchemas(child, path ? `${path}.${key}` : key);
  });
}

const heatPumpLeaves = leafSchemas(HeatPumpPanelFields, "");
const leaves = {
  heat_pump: heatPumpLeaves,
  heat_pump_panel: heatPumpLeaves,
  panel: leafSchemas(ServiceFields.extend({ panelUpgrade: HeatPumpPanelFields.shape.panelUpgrade }), ""),
  ev_charger: leafSchemas(EvChargerFields, ""),
  home_battery: leafSchemas(HomeBatteryFields, ""),
} satisfies Record<ExtractionJob, Array<readonly [string, z.ZodType]>>;

const numberReading = z.strictObject({ value: z.number().nullable(), ...readingDetails });
const booleanReading = z.strictObject({ value: z.boolean().nullable(), ...readingDetails });
const textReading = z.strictObject({ value: z.string().nullable(), ...readingDetails });

export function evidenceSchema(job: ExtractionJob) {
  const shape = leaves[job].map<readonly [string, z.ZodType<FieldReading>]>(([path, schema]) => {
    if (schema instanceof z.ZodNumber) return [path, numberReading];
    if (schema instanceof z.ZodBoolean) return [path, booleanReading];
    if (schema instanceof z.ZodEnum) {
      return [path, z.strictObject({ value: schema.nullable(), ...readingDetails })];
    }
    return [path, textReading];
  });
  return z.strictObject(Object.fromEntries(shape));
}

function normalizeReading(path: string, schema: z.ZodType, reading: FieldReading): FieldReading {
  const source = reading.source.trim();
  if (reading.value === null || !source || /^(?:not found|unknown|not provided|unreadable|n\/a)[.!]?$/i.test(source)) {
    return missingReading;
  }

  let value = typeof reading.value === "string" ? reading.value.trim() : reading.value;
  let unit: Unit | null = null;
  if (typeof value === "number") {
    const target = unitBySuffix.find(([suffix]) => suffix.test(path))?.[1];
    if (!target) return missingReading;
    const reported = reading.unit?.toLowerCase().replaceAll("²", "2").replace(/[\s._-]/g, "");
    const factors: Record<string, number> = unitFactors[target];
    const factor = !reported ? (target === "count" ? 1 : undefined)
      : Object.hasOwn(factors, reported) ? factors[reported] : undefined;
    if (factor === undefined) return missingReading;
    value *= factor;
    unit = target;
  }

  if (value === "" || !schema.safeParse(value).success) return missingReading;
  return { value, unit, confidence: reading.confidence, source };
}

export function normalizeEvidence(job: ExtractionJob, raw: unknown): Evidence {
  const parsed = evidenceSchema(job).parse(raw);
  return Object.fromEntries(leaves[job].map(([path, schema]) => [
    path, normalizeReading(path, schema, parsed[path] ?? missingReading),
  ]));
}

function assignField(fields: Record<string, unknown>, path: string, value: FieldReading["value"]) {
  const keys = path.split(".");
  const leaf = keys.pop()!;
  let node = fields;
  for (const key of keys) {
    const child = node[key];
    if (child !== null && typeof child === "object") {
      node = child as Record<string, unknown>;
    } else {
      const next = {};
      node[key] = next;
      node = next;
    }
  }
  node[leaf] = value;
}

export function toExtraction(
  job: ExtractionJob,
  evidence: Evidence,
  model: string,
  extractedAt: string,
): Extraction | null {
  const jobType: JobType = job === "heat_pump" || job === "panel" ? "heat_pump_panel" : job;
  const fields: Record<string, unknown> = { jobType };
  if (jobType === "heat_pump_panel") fields.panelUpgrade = null;
  const fieldConfidence: Record<string, number> = {};
  const missingFields: string[] = [];

  for (const [path] of leaves[job]) {
    const { value, confidence } = evidence[path] ?? missingReading;
    fieldConfidence[path] = confidence;
    if (value === null) {
      missingFields.push(path);
      // A missing panel-upgrade section stays null. A partially read section
      // must still meet the contract's two required ratings.
      if (path.startsWith("panelUpgrade.")) continue;
    }
    assignField(fields, path, value);
  }

  const result = Extraction.safeParse({ fields, fieldConfidence, missingFields, model, extractedAt });
  return result.success ? result.data : null;
}
