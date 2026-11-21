/**
 * The rule pack format. One pack per JobType.
 * Packs are pure: no I/O, no LLM calls, no Date.now(). Same fields in, same results out.
 */
import type { z } from "zod";
import type {
  CheckResult,
  CheckStatus,
  CleanEnergyTip,
  FieldsFor,
  JobType,
  NewLoad,
  UtilityFlag,
} from "@permitpike/contract";

export interface Rule<J extends JobType> {
  /** "<jobType>.<rule>", stable forever: the audit log references it. */
  id: string;
  title: string;
  /** Code section this rule enforces, e.g. "NEC 440.22". */
  citation: string;
  check(fields: FieldsFor<J>): CheckResult;
}

export interface RulePack<J extends JobType> {
  jobType: J;
  /** Bump when rules change. */
  version: string;
  extraction: {
    /** Zod schema Gemini output must satisfy (from the contract). */
    schema: z.ZodType<FieldsFor<J>>;
    /** Plain-language hints for the extraction prompt: where to find each field. */
    hints: string[];
  };
  rules: Rule<J>[];
  /**
   * Loads this job adds, fed to calculateLoad in @permitpike/loadcalc. Connected VA
   * (before demand factors), one entry per load: a heat pump with backup strips is two.
   */
  addedLoads(fields: FieldsFor<J>): NewLoad[];
  /** Service rating to compare against. Differs from existing for service upgrades. */
  serviceRatingAmps(fields: FieldsFor<J>): number;
  utilityFlag(fields: FieldsFor<J>): UtilityFlag | null;
  cleanEnergyTip(fields: FieldsFor<J>): CleanEnergyTip | null;
  /** What the field inspector verifies on site. */
  inspectorChecklist: string[];
}

/** Build a CheckResult for a rule. Keeps ruleId/title/citation in one place. */
export function result<J extends JobType>(
  rule: Pick<Rule<J>, "id" | "title" | "citation">,
  status: CheckStatus,
  message: string,
  suggestedFix: string | null = null,
): CheckResult {
  return {
    ruleId: rule.id,
    title: rule.title,
    status,
    citation: rule.citation,
    message,
    suggestedFix: status === "pass" ? null : suggestedFix,
  };
}
