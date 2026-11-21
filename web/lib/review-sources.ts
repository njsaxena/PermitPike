import type { FileKind, JobType } from "@permitpike/contract";
import { complianceSources, type ComplianceSource } from "@permitpike/compliance/catalog";
import { zoningCodeLinks } from "@permitpike/compliance/zoning-code-links";
import { longDate } from "./format";

/*
 * Where a reviewer checks things. Two lookups:
 * - codeSource: the published source behind a citation, from the reviewed catalog in
 *   packages/compliance. No source text is written here, only names and links.
 * - which document backs up each extracted field and each check, so the document viewer
 *   can say "check these against this file" and a check can open its document.
 *   The extraction has no per-field provenance yet, so this is where a reviewer should
 *   look, not a claim about where the model read it.
 */

const byId = (id: string) => complianceSources.find((s) => s.id === id);

export interface CodeSource {
  /** Plain name, e.g. "Massachusetts Electrical Code (527 CMR 12.00)". */
  name: string;
  /** Edition and effective date, when known. */
  detail: string | null;
  url: string;
}

function fromCatalog(s: ComplianceSource | undefined, name?: string): CodeSource | null {
  if (!s) return null;
  const effective = s.effectiveDate ? `in effect since ${longDate(s.effectiveDate)}` : null;
  return {
    name: name ?? `${s.title} (${s.citation})`,
    detail: [s.edition, effective].filter(Boolean).join(", ") || null,
    url: s.url,
  };
}

/** The published source for a citation, or null when it is not in the catalog. */
export function codeSource(citation: string): CodeSource | null {
  if (/^(NEC|527 CMR 12)/.test(citation)) {
    return fromCatalog(byId("ma-electrical-code"), "Massachusetts Electrical Code (527 CMR 12.00)");
  }
  const zoning = /Boston Zoning Code,? Art(?:icle|\.)\s*(\d+)/.exec(citation);
  if (zoning) {
    const catalogued = complianceSources.find((s) => s.citation === `Boston Zoning Code, Article ${zoning[1]}`);
    if (catalogued) return fromCatalog(catalogued);
    const { articleUrl } = zoningCodeLinks(zoning[1]!, "");
    return articleUrl ? { name: `Boston Zoning Code, Article ${zoning[1]}`, detail: null, url: articleUrl } : null;
  }
  if (/^527 CMR 1\b/.test(citation)) return fromCatalog(byId("ma-fire-code"));
  return null;
}

/** Catalog sources that apply to a job type, for the reviewer's reference list. */
export function sourcesFor(jobType: JobType): readonly ComplianceSource[] {
  return complianceSources.filter((s) => s.jobTypes.includes(jobType));
}

/** Where a field is backed up. "application" means the applicant typed it on the form. */
export type FieldSource = FileKind | "application";

const FIELD_SOURCE: [RegExp, FieldSource][] = [
  [/^(heatPump|charger|battery)\./, "spec_sheet"],
  [/^(gfciProtected|outdoorRated)$/, "spec_sheet"],
  [/^(serviceVoltage|existingServiceAmps|existingPanelRatingAmps|mainBreakerAmps|availableBreakerSpaces|panelWorkingClearanceIn|backfeedBreakerAmps)$/, "panel_photo"],
  [/^(outdoorUnitSetbackFt|setbackFt|installLocation|clearanceToOpeningsFt|disconnectWithinSight)$/, "site_plan"],
];

export function fieldSource(key: string): FieldSource {
  return FIELD_SOURCE.find(([re]) => re.test(key))?.[1] ?? "application";
}

/** The fields each check reads, by rule id. */
export const RULE_FIELDS: Record<string, string[]> = {
  "heat_pump_panel.breaker_sizing": ["proposedBreakerAmps", "heatPump.mcaAmps", "heatPump.mocpAmps"],
  "heat_pump_panel.outdoor_setback": ["outdoorUnitSetbackFt"],
  "heat_pump_panel.outdoor_gfci": ["gfciProtected", "proposedBreakerAmps"],
  "shared.service_capacity": ["existingServiceAmps", "panelUpgrade"],
  "ev_charger.breaker_125_percent": ["proposedBreakerAmps", "charger.outputAmps"],
  "ev_charger.gfci": ["gfciProtected"],
  "ev_charger.load_management": ["hasLoadManagement"],
  "ev_charger.outdoor_rated": ["outdoorRated"],
  "home_battery.busbar_120_percent": ["backfeedBreakerAmps", "existingPanelRatingAmps", "mainBreakerAmps"],
  "home_battery.listing": ["battery.ul9540Listed"],
  "home_battery.location": ["installLocation", "clearanceToOpeningsFt"],
};

const RULE_DOC: [RegExp, FileKind][] = [
  [/setback|location/, "site_plan"],
  [/service_capacity|busbar/, "panel_photo"],
  [/load_management/, "other"],
  [/./, "spec_sheet"],
];

/** The document a check is best verified against. */
export function ruleDocument(ruleId: string): FileKind {
  return RULE_DOC.find(([re]) => re.test(ruleId))![1];
}

export const DOCUMENT_LABEL: Record<FileKind, string> = {
  spec_sheet: "Spec sheet",
  panel_photo: "Panel photo",
  site_plan: "Site plan",
  load_calc: "Load calculation",
  other: "Other document",
};

/** "Low" below this: the reviewer should check the value against the document. */
export const LOW_CONFIDENCE = 0.85;
