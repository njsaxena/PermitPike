import { JobType, type EvalCaseResult, type EvalRun } from "@permitpike/contract";

/*
 * Scores for the eval dashboard, computed from a stored EvalRun. The definitions follow
 * evals/run.ts so the page and `pnpm evals` agree.
 */

export interface RunSummary {
  total: number;
  passed: number;
  decisionMatches: number;
  /** Recommended approve when the case expected return_for_fixes. */
  dangerousMisses: number;
  /** Returned for fixes when the case expected it to pass (approve, with or without conditions). */
  falseFlags: number;
}

export function summarize(run: EvalRun): RunSummary {
  const r = run.results;
  return {
    total: run.totalCases,
    passed: run.passedCases,
    decisionMatches: r.filter((x) => x.actualDecision === x.expectedDecision).length,
    dangerousMisses: r.filter((x) => x.actualDecision === "approve" && x.expectedDecision === "return_for_fixes")
      .length,
    falseFlags: r.filter((x) => x.actualDecision === "return_for_fixes" && x.expectedDecision !== "return_for_fixes")
      .length,
  };
}

/** Decision match as a percentage, or null for a run with no cases. */
export function decisionMatchPct(run: EvalRun): number | null {
  if (run.results.length === 0) return null;
  return (summarize(run).decisionMatches / run.results.length) * 100;
}

/** Runs saved before the rule-level fields existed can't fill the per-rule table. */
export function hasRuleDetail(run: EvalRun): boolean {
  return (
    run.results.length > 0 &&
    run.results.every((x) => x.checkedRuleIds && x.expectedFailingRuleIds && x.actualFailingRuleIds)
  );
}

export interface RuleScore {
  ruleId: string;
  cases: number;
  /** Cases where the rule failed exactly when the case expected it to. */
  correct: number;
  accuracy: number;
}

export interface RuleGroup {
  jobType: JobType;
  rules: RuleScore[];
}

/**
 * Per-rule accuracy (fail vs not-fail), grouped by job type and sorted worst first.
 * The shared load check appears in every group, scored on that job's cases.
 */
export function ruleGroups(run: EvalRun): RuleGroup[] {
  const groups: RuleGroup[] = [];
  for (const jobType of JobType.options) {
    const cases = run.results.filter((x) => x.jobType === jobType);
    if (cases.length === 0) continue;
    const scores = new Map<string, { cases: number; correct: number }>();
    for (const c of cases) {
      const expected = new Set(c.expectedFailingRuleIds ?? []);
      const actual = new Set(c.actualFailingRuleIds ?? []);
      for (const id of c.checkedRuleIds ?? []) {
        const s = scores.get(id) ?? { cases: 0, correct: 0 };
        s.cases += 1;
        if (expected.has(id) === actual.has(id)) s.correct += 1;
        scores.set(id, s);
      }
    }
    const rules = [...scores].map(([ruleId, s]) => ({ ruleId, ...s, accuracy: s.correct / s.cases }));
    rules.sort((a, b) => a.accuracy - b.accuracy || b.cases - a.cases || a.ruleId.localeCompare(b.ruleId));
    groups.push({ jobType, rules });
  }
  return groups;
}

/** Failed cases first, then by id. */
export function sortCases(results: EvalCaseResult[]): EvalCaseResult[] {
  return [...results].sort((a, b) => Number(a.passed) - Number(b.passed) || a.caseId.localeCompare(b.caseId));
}

/** The last `n` runs, oldest first, for the history line. Input is newest first (as the API sends it). */
export function history(runs: EvalRun[], n = 10): EvalRun[] {
  return runs.slice(0, n).reverse();
}
