/**
 * Turns checks + load calc into a Recommendation. Pure: the decision comes only from
 * the checks. The model writes the summary afterwards and never touches anything else.
 */
import type {
  CheckResult,
  Extraction,
  JobType,
  LoadCalcResult,
  Recommendation,
  RecommendationDecision,
  UtilityFlag,
} from "@permitpike/contract";
import { getPack, type RulePack } from "@permitpike/packs";

export function decide(checks: CheckResult[], flag: UtilityFlag | null): RecommendationDecision {
  if (checks.some((c) => c.status === "fail")) return "return_for_fixes";
  if (flag || checks.some((c) => c.status === "warn")) return "approve_with_conditions";
  return "approve";
}

/** Mean of the extraction's per-field confidence, 0 when there is none. Two decimals. */
export function confidenceFrom(extraction: Extraction): number {
  const values = Object.values(extraction.fieldConfidence);
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(Math.min(1, Math.max(0, mean)) * 100) / 100;
}

/** The pack's own flag (a proposed service upgrade), else one when the load calc says the service is too small. */
export function utilityFlagFor(packFlag: UtilityFlag | null, loadCalc: LoadCalcResult): UtilityFlag | null {
  if (packFlag) return packFlag;
  if (!loadCalc.utilityLikely) return null;
  return {
    utility: "Eversource",
    kind: "service_upgrade",
    reason: `Calculated load is ${Math.round(loadCalc.totalAmps)} A, ${Math.round(loadCalc.percentOfRating)}% of the ${loadCalc.serviceAmps} A service.`,
    action: "Upgrade the service and open an Eversource service upgrade request before installation.",
  };
}

function conditionsFor(checks: CheckResult[], flag: UtilityFlag | null): string[] {
  const out = checks.filter((c) => c.status === "warn").map((c) => c.suggestedFix ?? c.message);
  if (flag) out.push(flag.action);
  return [...new Set(out)];
}

const DECISION_WORDS: Record<RecommendationDecision, string> = {
  approve: "approve",
  approve_with_conditions: "approve with conditions",
  return_for_fixes: "return for fixes",
};

/** Plain summary used when the model is unavailable or times out. */
export function fallbackSummary(r: Pick<Recommendation, "decision" | "checks" | "loadCalc" | "utilityFlag">): string {
  const count = (s: CheckResult["status"]) => r.checks.filter((c) => c.status === s).length;
  const failed = r.checks.filter((c) => c.status === "fail").map((c) => c.title);
  const lc = r.loadCalc;
  const parts = [
    `Rule checks recommend: ${DECISION_WORDS[r.decision]}.`,
    `${count("pass")} passed, ${count("warn")} need attention, ${count("fail")} failed.`,
    failed.length ? `Failed: ${failed.join("; ")}.` : "",
    `Load calc: ${Math.round(lc.totalAmps)} A on a ${lc.serviceAmps} A service (${Math.round(lc.percentOfRating)}%, ${lc.result.replace("_", " ")}).`,
    r.utilityFlag ? `Eversource: ${r.utilityFlag.reason}` : "",
    "A licensed official makes the final call.",
  ];
  return parts.filter(Boolean).join(" ");
}

export interface RecommendInput {
  version: number;
  extraction: Extraction;
  checks: CheckResult[];
  loadCalc: LoadCalcResult;
  createdAt: string;
}

/** Everything except a model-written summary. `summary` is the fallback; `model` names the rule pack. */
export function buildRecommendation(input: RecommendInput): Recommendation {
  const fields = input.extraction.fields;
  const pack = getPack(fields.jobType) as unknown as RulePack<JobType>;
  const f = fields as Parameters<typeof pack.utilityFlag>[0];

  const utilityFlag = utilityFlagFor(pack.utilityFlag(f), input.loadCalc);
  const decision = decide(input.checks, utilityFlag);
  const base = {
    decision,
    checks: input.checks,
    loadCalc: input.loadCalc,
    utilityFlag,
  };
  return {
    ...base,
    confidence: confidenceFrom(input.extraction),
    conditions: decision === "approve_with_conditions" ? conditionsFor(input.checks, utilityFlag) : [],
    cleanEnergyTip: pack.cleanEnergyTip(f),
    inspectorChecklist: [...pack.inspectorChecklist],
    summary: fallbackSummary(base),
    version: input.version,
    model: `rules:${pack.jobType}@${pack.version}`,
    createdAt: input.createdAt,
  };
}
