import type { Recommendation } from "@permitpike/contract";
import type { RiskLevel } from "@/components/ui/RiskBadge";

/**
 * Queue risk from a recommendation. Null until PermitPike has posted one.
 * high: a failing check or a return. med: warnings, conditions, a utility flag or
 * low confidence. low: everything passed.
 */
export function riskOf(rec: Recommendation | null): RiskLevel | null {
  if (!rec) return null;
  if (rec.decision === "return_for_fixes" || rec.checks.some((c) => c.status === "fail")) return "high";
  if (
    rec.decision === "approve_with_conditions" ||
    rec.utilityFlag !== null ||
    rec.confidence < 0.7 ||
    rec.checks.some((c) => c.status === "warn")
  ) {
    return "med";
  }
  return "low";
}

export const RISK_ORDER: Record<RiskLevel, number> = { high: 0, med: 1, low: 2 };
