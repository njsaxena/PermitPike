import {
  EvChargerFields,
  HeatPumpPanelFields,
  HomeBatteryFields,
  type ExtractedFields,
  type JobType,
} from "@permitpike/contract";

/*
 * Editing the permit record by hand. Every input's kind, options and nullability come
 * from the contract's Zod schemas, so the editor can't drift from the shape the agent,
 * packs and API agree on. Paths are the extraction's dot paths ("heatPump.mcaAmps").
 */

const SCHEMA: Record<JobType, typeof HeatPumpPanelFields | typeof EvChargerFields | typeof HomeBatteryFields> = {
  heat_pump_panel: HeatPumpPanelFields,
  ev_charger: EvChargerFields,
  home_battery: HomeBatteryFields,
};

export type InputKind = "number" | "boolean" | "text" | "enum";

export interface RecordInput {
  /** Dot path of the value this input edits. */
  path: string;
  label: string;
  kind: InputKind;
  nullable: boolean;
  /** For enums: the allowed values. */
  options?: readonly string[];
  /** Unit shown after the input and after the saved value, e.g. "A". */
  unit?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- walking Zod internals
type AnySchema = any;

function schemaAt(jobType: JobType, path: string): { schema: AnySchema; nullable: boolean } | null {
  let s: AnySchema = SCHEMA[jobType];
  let nullable = false;
  for (const part of path.split(".")) {
    while (s?.def?.type === "nullable" || s?.def?.type === "optional") {
      nullable = true;
      s = s.def.innerType;
    }
    s = s?.shape?.[part];
    if (!s) return null;
    nullable = false;
  }
  while (s?.def?.type === "nullable" || s?.def?.type === "optional") {
    nullable = true;
    s = s.def.innerType;
  }
  return { schema: s, nullable };
}

/** The unit for a field, from its name: "mcaAmps" -> "A". */
export function unitFor(path: string): string | undefined {
  const k = path.split(".").at(-1)!;
  if (k === "conductorAWG") return "AWG";
  const units: [RegExp, string][] = [
    [/SqFt$/, "sq ft"],
    [/Amps$/, "A"],
    [/VA$/, "VA"],
    [/KWh$/, "kWh"],
    [/KW$/, "kW"],
    [/OutputW$/, "W"],
    [/BTU$/, "BTU/h"],
    [/Ft$/, "ft"],
    [/In$/, "in"],
    [/^voltage$|Voltage$/, "V"],
  ];
  return units.find(([re]) => re.test(k))?.[1];
}

export function inputFor(jobType: JobType, path: string, label: string, unit?: string): RecordInput | null {
  const found = schemaAt(jobType, path);
  if (!found) return null;
  const type = found.schema.def.type as string;
  const kind: InputKind | null =
    type === "number" ? "number" : type === "boolean" ? "boolean" : type === "string" ? "text" : type === "enum" ? "enum" : null;
  if (!kind) return null;
  return {
    path,
    label,
    kind,
    nullable: found.nullable,
    options: kind === "enum" ? (found.schema.options as string[]) : undefined,
    unit,
  };
}

export function getAt(fields: ExtractedFields, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), fields);
}

export function setAt(fields: ExtractedFields, path: string, value: unknown): ExtractedFields {
  const next = structuredClone(fields);
  const parts = path.split(".");
  let o = next as unknown as Record<string, unknown>;
  for (const k of parts.slice(0, -1)) o = o[k] as Record<string, unknown>;
  o[parts.at(-1)!] = value;
  return next;
}

/** "exterior_wall" -> "Exterior wall" */
export const optionLabel = (v: string) => v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** The text an input starts with for a stored value. */
export function toDraft(input: RecordInput, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (input.kind === "boolean") return value ? "yes" : "no";
  return String(value);
}

/** Parses one input. Returns the value, or an error message for the reviewer. */
export function fromDraft(input: RecordInput, draft: string): { value: unknown } | { error: string } {
  const t = draft.trim();
  if (t === "") return input.nullable ? { value: null } : { error: "This can't be empty." };
  if (input.kind === "number") {
    const n = Number(t.replace(/,/g, ""));
    return Number.isFinite(n) ? { value: n } : { error: "Enter a number." };
  }
  if (input.kind === "boolean") return { value: t === "yes" };
  return { value: t };
}

/** Checks the whole record against the contract. Returns a message per dot path. */
export function validate(jobType: JobType, fields: ExtractedFields): Record<string, string> {
  const r = SCHEMA[jobType].safeParse(fields);
  if (r.success) return {};
  const out: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join(".");
    if (out[key]) continue;
    out[key] =
      issue.code === "too_small"
        ? issue.inclusive
          ? "Can't be negative."
          : "Must be more than 0."
        : issue.code === "invalid_type" && issue.expected === "int"
          ? "Enter a whole number."
          : "Check this value.";
  }
  return out;
}
