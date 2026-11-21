/**
 * Deterministic part of the review: rule pack checks and the shared load calc.
 * Pure TypeScript. No model calls, no I/O, no clocks.
 */
import type {
  CheckResult,
  ExistingAppliance,
  ExtractedFields,
  Extraction,
  JobType,
  LoadCalcInput,
  LoadCalcResult,
} from "@permitpike/contract";
import { calculateLoad } from "@permitpike/loadcalc";
import { getPack, type Rule, type RulePack } from "@permitpike/packs";

/**
 * Dot paths each rule reads. When the extraction lists one of these in missingFields,
 * the rule is skipped and recorded for manual review instead of run on a guessed value.
 * Every heat pump rule must be listed here (agent/test/review.test.ts checks it).
 */
export const RULE_REQUIRED_FIELDS: Record<string, string[]> = {
  "heat_pump_panel.breaker_sizing": ["heatPump.mcaAmps", "heatPump.mocpAmps", "proposedBreakerAmps"],
  "heat_pump_panel.outdoor_setback": ["outdoorUnitSetbackFt"],
  "heat_pump_panel.disconnect_within_sight": ["disconnectWithinSight"],
  "heat_pump_panel.outdoor_gfci": ["gfciProtected", "proposedBreakerAmps", "serviceVoltage"],
  "heat_pump_panel.conductor_ampacity": ["conductorAWG", "heatPump.mcaAmps"],
  "heat_pump_panel.breaker_space_available": ["availableBreakerSpaces", "heatPump.voltage"],
  "heat_pump_panel.panel_working_clearance": ["panelWorkingClearanceIn"],
  "heat_pump_panel.panel_upgrade_matches_service": [
    "panelUpgrade",
    "existingServiceAmps",
    "heatPump.mcaAmps",
    "heatPump.voltage",
  ],
};

/** Dot paths the load calc reads. If any is missing the review can't finish. */
const LOAD_CALC_REQUIRED_FIELDS = ["serviceVoltage", "existingServiceAmps", "existingLoad.fixedAppliancesVA", "existingLoad.existingHvacVA"];
const LOAD_CALC_SQFT_FIELD = "existingLoad.dwellingSqFt";
const LOAD_CALC_REQUIRED_BY_JOB: Partial<Record<JobType, string[]>> = {
  heat_pump_panel: ["heatPump.mcaAmps", "heatPump.voltage"],
};

/** Thrown when the review can't produce an honest result. The message says why. */
export class ReviewIncompleteError extends Error {
  override name = "ReviewIncompleteError";
}

export interface ChecksResult {
  /** Rule checks, manual-review items (status "warn"), then the load calc check. */
  checks: CheckResult[];
  loadCalc: LoadCalcResult;
  /** Rule ids skipped because a field they read was missing. */
  manualReviewRuleIds: string[];
}

/** True when `path` is missing, or a parent of it is (missing "heatPump" covers "heatPump.mcaAmps"). */
function isMissing(path: string, missing: string[]): boolean {
  return missing.some((m) => path === m || path.startsWith(`${m}.`));
}

function manualReviewCheck(rule: Pick<Rule<JobType>, "id" | "title" | "citation">, paths: string[]): CheckResult {
  const list = paths.join(", ");
  return {
    ruleId: rule.id,
    title: rule.title,
    status: "warn",
    citation: rule.citation,
    message: `Not checked: the documents do not show ${list}. Manual review needed.`,
    suggestedFix: `Reviewer verifies ${rule.title.toLowerCase()} by hand, or the applicant adds ${list} to the documents.`,
  };
}

/** Turns the extracted house description into calculateLoad input. */
export function loadCalcInput(fields: ExtractedFields, pack: RulePack<JobType>): LoadCalcInput {
  const e = fields.existingLoad;
  const appliances: ExistingAppliance[] = [];
  if (e.fixedAppliancesVA > 0) {
    appliances.push({ name: "Fixed appliances (nameplate total)", watts: e.fixedAppliancesVA, isHeatingOrCooling: false });
  }
  if (e.existingHvacVA > 0) {
    // Season unknown from the documents, so "both": never omitted (conservative).
    appliances.push({ name: "Existing heating/cooling that stays", watts: e.existingHvacVA, isHeatingOrCooling: true, hvacMode: "both" });
  }
  return {
    service: { ratingAmps: pack.serviceRatingAmps(fields), voltage: fields.serviceVoltage },
    home: {
      squareFeet: e.dwellingSqFt,
      smallApplianceCircuits: e.smallApplianceCircuits,
      laundryCircuits: e.hasLaundryCircuit ? 1 : 0,
      existingAppliances: appliances,
      ...(e.measuredPeakDemandKW !== null
        ? { measuredDemand: { peakKW: e.measuredPeakDemandKW, source: "utility_12_months" as const } }
        : {}),
    },
    newLoads: pack.addedLoads(fields),
  };
}

export function runChecks(extraction: Extraction): ChecksResult {
  const fields = extraction.fields;
  // Each pack only sees its own job type's fields (same pattern as evals/run.ts).
  const pack = getPack(fields.jobType) as unknown as RulePack<JobType>;
  const f = fields as Parameters<typeof pack.serviceRatingAmps>[0];
  const missing = extraction.missingFields;

  const checks: CheckResult[] = [];
  const manualReviewRuleIds: string[] = [];
  for (const rule of pack.rules) {
    const gaps = (RULE_REQUIRED_FIELDS[rule.id] ?? []).filter((p) => isMissing(p, missing));
    if (gaps.length > 0) {
      checks.push(manualReviewCheck(rule, gaps));
      manualReviewRuleIds.push(rule.id);
      continue;
    }
    checks.push(rule.check(f));
  }

  const loadCalcNeeds = [
    ...LOAD_CALC_REQUIRED_FIELDS,
    ...(LOAD_CALC_REQUIRED_BY_JOB[fields.jobType] ?? []),
    ...(fields.existingLoad.measuredPeakDemandKW === null ? [LOAD_CALC_SQFT_FIELD] : []),
  ].filter((p) => isMissing(p, missing));
  if (loadCalcNeeds.length > 0) {
    throw new ReviewIncompleteError(
      `Load calc can't run: the documents do not show ${loadCalcNeeds.join(", ")}. No recommendation was made.`,
    );
  }

  const loadCalc = calculateLoad(loadCalcInput(fields, pack));
  checks.push(loadCalc.check);
  return { checks, loadCalc, manualReviewRuleIds };
}
