import type { Application, ExtractedFields, LoadCalcResult } from "@permitpike/contract";
import { getPack } from "@permitpike/packs";
import { streetLine } from "./format";

/*
 * Eversource "Step 0": before a formal new-service request, Massachusetts utilities ask the
 * customer to share the load they plan to add. PermitPike pre-fills it from the permit so
 * the electrician can send it to Eversource at the same time as the city permit.
 * PermitPike never sends it anywhere. Every value comes from the application; anything
 * the application doesn't have reads "Not provided".
 */

/** Eversource's page for contractors. Checked to load; don't add other Eversource URLs. */
export const EVERSOURCE_CONTRACTOR_URL =
  "https://www.eversource.com/residential/about/doing-business-with-us/builders-contractors/electric-work-order-management";

export const STEP0_TITLE = "Eversource Step 0 draft";
export const STEP0_DISCLAIMER =
  "Draft for the electrician to submit to Eversource. PermitPike does not send anything to Eversource.";
export const NOT_PROVIDED = "Not provided";

export type Step0FieldKey =
  | "address"
  | "parcelId"
  | "existingServiceAmps"
  | "serviceVoltage"
  | "proposedServiceAmps"
  | "newLoad"
  | "totalLoad"
  | "percentOfRating"
  | "contractor"
  | "licenseNumber"
  | "trackingCode"
  | "preparedOn";

export interface Step0Field {
  key: Step0FieldKey;
  label: string;
  value: string;
}

export interface Step0Draft {
  fields: Step0Field[];
  /** Plain text for copy and paste: title, disclaimer, then "Label: value" lines. */
  text: string;
}

/** 5520 -> "5.52", 7200 -> "7.2". */
function kW(va: number): string {
  return String(Math.round(va / 10) / 100);
}

function makeModel(m: { manufacturer: string | null; model: string | null }): string | null {
  const name = [m.manufacturer, m.model].filter(Boolean).join(" ");
  return name || null;
}

/** The loads the job adds, as "device, kW". Uses the rule pack's own list. */
function newLoads(f: ExtractedFields): string[] {
  if (f.jobType === "home_battery") {
    // The pack counts a battery as 0 VA in the load calc; for the utility, its output is what matters.
    const name = makeModel(f.battery);
    return [
      `Home battery${name ? ` (${name})` : ""}, ${kW(f.battery.continuousOutputW)} kW output, ${f.battery.capacityKWh} kWh`,
    ];
  }
  const device = f.jobType === "heat_pump_panel" ? makeModel(f.heatPump) : makeModel(f.charger);
  return getPack(f.jobType)
    .addedLoads(f as never)
    .map((load, i) => `${load.name}${i === 0 && device ? ` (${device})` : ""}, ${kW(load.va)} kW`);
}

/** "November 21, 2026" in Boston time. */
function bostonDate(at: Date): string {
  return at.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
}

/**
 * The Step 0 draft for an application. Pass loadCalc only where the city's review may be
 * shown (the official's view); without it, the total load lines are left out.
 */
export function buildStep0Draft(
  application: Application,
  loadCalc?: LoadCalcResult | null,
  preparedAt: Date = new Date(),
): Step0Draft {
  const app = application;
  const f = app.extraction?.fields ?? null;
  const a = app.address;
  const fields: Step0Field[] = [
    { key: "address", label: "Service address", value: `${streetLine(a)}, ${a.city}, ${a.state} ${a.zip}` },
    { key: "parcelId", label: "Parcel ID", value: app.parcel?.parcelId ?? NOT_PROVIDED },
    { key: "existingServiceAmps", label: "Existing service", value: f ? `${f.existingServiceAmps} A` : NOT_PROVIDED },
    { key: "serviceVoltage", label: "Service voltage", value: f ? `${f.serviceVoltage} V` : NOT_PROVIDED },
  ];

  const proposed = f?.jobType === "heat_pump_panel" ? (f.panelUpgrade?.proposedServiceAmps ?? null) : null;
  if (proposed !== null) fields.push({ key: "proposedServiceAmps", label: "Proposed service", value: `${proposed} A` });

  const loads = f ? newLoads(f) : [];
  if (loads.length === 0) fields.push({ key: "newLoad", label: "New load", value: NOT_PROVIDED });
  for (const load of loads) fields.push({ key: "newLoad", label: "New load", value: load });

  if (loadCalc) {
    fields.push(
      {
        key: "totalLoad",
        label: "Total calculated load",
        value: `${kW(loadCalc.totalCalculatedVA)} kW (${Math.round(loadCalc.totalAmps)} A)`,
      },
      {
        key: "percentOfRating",
        label: "Percent of service rating",
        value: `${Math.round(loadCalc.percentOfRating)}% of ${loadCalc.serviceAmps} A`,
      },
    );
  }

  const contractor = [app.applicant.name, app.applicant.company].filter(Boolean).join(", ");
  fields.push(
    { key: "contractor", label: "Contractor", value: contractor || NOT_PROVIDED },
    { key: "licenseNumber", label: "License number", value: app.applicant.licenseNumber || NOT_PROVIDED },
    { key: "trackingCode", label: "PermitPike tracking code", value: app.trackingCode },
    { key: "preparedOn", label: "Date prepared", value: bostonDate(preparedAt) },
  );

  const text = [STEP0_TITLE, STEP0_DISCLAIMER, "", ...fields.map((x) => `${x.label}: ${x.value}`)].join("\n");
  return { fields, text };
}

/**
 * True when the applicant's own inputs raise the service: a heat pump job with a proposed
 * service above the existing one. This, not the utility flag, decides whether the
 * applicant sees a draft on their own.
 */
export function applicantProposesUpgrade(app: Application): boolean {
  const f = app.extraction?.fields;
  if (f?.jobType !== "heat_pump_panel" || !f.panelUpgrade) return false;
  return f.panelUpgrade.proposedServiceAmps > f.existingServiceAmps;
}

/** Whether a message line or block is a draft an official sent. */
export function isStep0Text(text: string): boolean {
  return text.trimStart().startsWith(STEP0_TITLE);
}

/**
 * Splits an official's message into what they wrote and the draft they attached
 * (always last, after a blank line).
 */
export function splitStep0(text: string): { message: string; draft: string | null } {
  const at = text.indexOf(STEP0_TITLE);
  if (at === -1) return { message: text, draft: null };
  return { message: text.slice(0, at).trim(), draft: text.slice(at).trim() };
}

/** Rebuilds the field rows from a draft's text, for showing a draft an official sent. */
export function parseStep0Text(text: string): Step0Draft {
  const fields: Step0Field[] = [];
  for (const line of text.split("\n")) {
    const at = line.indexOf(": ");
    if (at === -1 || line.startsWith(STEP0_TITLE) || line === STEP0_DISCLAIMER) continue;
    const label = line.slice(0, at);
    fields.push({ key: keyFor(label), label, value: line.slice(at + 2) });
  }
  return { fields, text: text.trim() };
}

const KEY_BY_LABEL: Record<string, Step0FieldKey> = {
  "Service address": "address",
  "Parcel ID": "parcelId",
  "Existing service": "existingServiceAmps",
  "Service voltage": "serviceVoltage",
  "Proposed service": "proposedServiceAmps",
  "New load": "newLoad",
  "Total calculated load": "totalLoad",
  "Percent of service rating": "percentOfRating",
  Contractor: "contractor",
  "License number": "licenseNumber",
  "PermitPike tracking code": "trackingCode",
  "Date prepared": "preparedOn",
};

function keyFor(label: string): Step0FieldKey {
  return KEY_BY_LABEL[label] ?? "newLoad";
}
