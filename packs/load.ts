/**
 * The shared review pipeline for one application: rule pack checks + load calc + decision.
 * loadcalc uses NEC 2026 120.87 when the applicant gave a 12-month measured peak, else 120.83.
 */
import type { CheckResult, ExtractedFields, LoadCalcResult, RecommendationDecision, UtilityFlag } from "@permitpike/contract";
import { calculateLoad } from "@permitpike/loadcalc";
import { getPack } from "./index";
import { loadCalcInputFor } from "./load_input";
import type { RulePack } from "./types";

function packFor(fields: ExtractedFields): RulePack<ExtractedFields["jobType"]> {
  return getPack(fields.jobType) as unknown as RulePack<ExtractedFields["jobType"]>;
}

/** Load calc for an application against the service it will have when the job is done. */
export function runLoadCalc(fields: ExtractedFields): LoadCalcResult {
  const pack = packFor(fields);
  const ratingAmps = pack.serviceRatingAmps(fields as never);
  return calculateLoad(loadCalcInputFor(fields, ratingAmps, pack.addedLoads(fields as never)));
}

/** Any fail returns for fixes; any warn or utility flag adds conditions. The AI only recommends. */
export function decide(checks: CheckResult[], flag: UtilityFlag | null): RecommendationDecision {
  if (checks.some((c) => c.status === "fail")) return "return_for_fixes";
  if (flag || checks.some((c) => c.status === "warn")) return "approve_with_conditions";
  return "approve";
}

export interface Review {
  checks: CheckResult[];
  loadCalc: LoadCalcResult;
  utilityFlag: UtilityFlag | null;
  decision: RecommendationDecision;
}

/** Runs every rule in the application's pack plus the load calc. Pure. */
export function reviewFields(fields: ExtractedFields): Review {
  const pack = packFor(fields);
  const loadCalc = runLoadCalc(fields);
  const checks = [loadCalc.check, ...pack.rules.map((r) => r.check(fields as never))];
  const utilityFlag = pack.utilityFlag(fields as never);
  return { checks, loadCalc, utilityFlag, decision: decide(checks, utilityFlag) };
}
