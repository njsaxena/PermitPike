/**
 * pnpm evals: runs the rule packs + load calc on every case and scores the results.
 *
 * Prints per-check accuracy, decision match, dangerous misses (recommended approve when
 * the case expects return_for_fixes) and false flags. With DATABASE_URL set, writes one
 * EvalRun row to eval_runs for GET /api/evals.
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { EvalCase, EvalRun } from "@permitpike/contract";
import type { EvalCaseResult } from "@permitpike/contract";
import { PACKS, reviewFields, type Review } from "@permitpike/packs";

const LOAD_CHECK_ID = "shared.service_capacity";
const MODEL = `rule-packs ${Object.values(PACKS).map((p) => `${p.jobType}@${p.version}`).join(" ")}`;

// --- Load cases -------------------------------------------------------------

const dir = join(import.meta.dirname, "cases");
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
const cases: EvalCase[] = [];
for (const file of files) {
  const parsed = EvalCase.safeParse(JSON.parse(readFileSync(join(dir, file), "utf8")));
  if (parsed.success) cases.push(parsed.data);
  else {
    console.log(`INVALID  ${file}`);
    console.log(parsed.error.issues);
  }
}
if (cases.length !== files.length) {
  console.log(`\n${files.length - cases.length}/${files.length} cases do not match the contract.`);
  process.exit(1);
}

// --- Run --------------------------------------------------------------------

interface Scored {
  c: EvalCase;
  review: Review | null;
  error: string | null;
  failing: Set<string>;
  falseFlags: string[];
  misses: string[];
  flagMatch: boolean;
  result: EvalCaseResult;
}

const scored: Scored[] = cases.map((c) => {
  let review: Review | null = null;
  let error: string | null = null;
  try {
    review = reviewFields(c.fields);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const failing = new Set(review?.checks.filter((x) => x.status === "fail").map((x) => x.ruleId) ?? []);
  const expected = new Set(c.expectedFailingRuleIds);
  const falseFlags = [...failing].filter((id) => !expected.has(id));
  const misses = [...expected].filter((id) => !failing.has(id));
  const flagMatch = (review?.utilityFlag != null) === c.expectUtilityFlag;
  // A run that throws can't recommend anything; the reviewer sees it as returned for fixes.
  const actualDecision = review?.decision ?? "return_for_fixes";
  const passed = !error && actualDecision === c.expectedDecision && falseFlags.length === 0 && misses.length === 0 && flagMatch;
  const notes = [
    error && `error: ${error}`,
    actualDecision !== c.expectedDecision && `decision ${actualDecision}, expected ${c.expectedDecision}`,
    falseFlags.length > 0 && `unexpected fails: ${falseFlags.join(", ")}`,
    misses.length > 0 && `missed fails: ${misses.join(", ")}`,
    !flagMatch && `utility flag ${c.expectUtilityFlag ? "missing" : "unexpected"}`,
  ].filter(Boolean);
  return {
    c,
    review,
    error,
    failing,
    falseFlags,
    misses,
    flagMatch,
    result: {
      caseId: c.id,
      jobType: c.fields.jobType,
      expectedDecision: c.expectedDecision,
      actualDecision,
      passed,
      notes: notes.length > 0 ? notes.join("; ") : null,
    },
  };
});

// --- Report -----------------------------------------------------------------

const pct = (n: number, d: number) => (d === 0 ? "  n/a" : `${((n / d) * 100).toFixed(1).padStart(5)}%`);

console.log(`Ran ${cases.length} cases with ${MODEL}\n`);
for (const s of scored) {
  console.log(`${s.result.passed ? "ok  " : "FAIL"}  ${s.c.id.padEnd(44)} ${s.result.actualDecision}${s.result.notes ? `  (${s.result.notes})` : ""}`);
}

// Per check: every case whose pipeline runs the rule. Correct = fail predicted iff fail expected.
console.log("\nPer-check accuracy (fail vs not-fail)");
console.log(`${"rule".padEnd(46)} cases  correct  accuracy  false_flags  misses`);
const ruleIds = [LOAD_CHECK_ID, ...Object.values(PACKS).flatMap((p) => p.rules.map((r) => r.id))];
for (const id of ruleIds) {
  const relevant = scored.filter((s) => id === LOAD_CHECK_ID || id.startsWith(`${s.c.fields.jobType}.`));
  const correct = relevant.filter((s) => s.failing.has(id) === s.c.expectedFailingRuleIds.includes(id)).length;
  const fp = relevant.filter((s) => s.failing.has(id) && !s.c.expectedFailingRuleIds.includes(id)).length;
  const fn = relevant.filter((s) => !s.failing.has(id) && s.c.expectedFailingRuleIds.includes(id)).length;
  const expectedFails = relevant.filter((s) => s.c.expectedFailingRuleIds.includes(id)).length;
  console.log(
    `${id.padEnd(46)} ${String(relevant.length).padStart(5)}  ${String(correct).padStart(7)}  ${pct(correct, relevant.length).padStart(8)}  ${String(fp).padStart(11)}  ${String(fn).padStart(6)}${expectedFails === 0 ? "   (no failing case)" : ""}`,
  );
}

const decisionMatches = scored.filter((s) => s.result.actualDecision === s.c.expectedDecision).length;
const flagMatches = scored.filter((s) => s.flagMatch).length;
const dangerous = scored.filter((s) => s.result.actualDecision === "approve" && s.c.expectedDecision === "return_for_fixes");
const falseFlags = scored.flatMap((s) => s.falseFlags.map((id) => `${s.c.id}: ${id}`));
const unexpectedUtility = scored.filter((s) => !s.flagMatch && !s.c.expectUtilityFlag).map((s) => `${s.c.id}: utility flag`);
const passedCases = scored.filter((s) => s.result.passed).length;

console.log("\nSummary");
console.log(`  Decision match     ${decisionMatches}/${cases.length} (${pct(decisionMatches, cases.length).trim()})`);
console.log(`  Utility flag match ${flagMatches}/${cases.length}`);
console.log(`  Dangerous misses   ${dangerous.length}${dangerous.map((s) => `\n    ${s.c.id}: recommended approve, expected return_for_fixes`).join("")}`);
console.log(`  False flags        ${falseFlags.length + unexpectedUtility.length}${[...falseFlags, ...unexpectedUtility].map((f) => `\n    ${f}`).join("")}`);
console.log(`  Cases passed       ${passedCases}/${cases.length}`);

// --- Persist ----------------------------------------------------------------

function gitSha(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return process.env.GITHUB_SHA ?? null;
  }
}

const run = EvalRun.parse({
  id: randomUUID(),
  ranAt: new Date().toISOString(),
  gitSha: gitSha(),
  model: MODEL,
  totalCases: cases.length,
  passedCases,
  results: scored.map((s) => s.result),
});

if (process.env.DATABASE_URL) {
  const { getDb, evalRuns } = await import("@permitpike/db");
  await getDb()
    .insert(evalRuns)
    .values({ ...run, ranAt: new Date(run.ranAt) });
  console.log(`\nWrote eval run ${run.id} to eval_runs.`);
} else {
  console.log("\nDATABASE_URL not set; eval run not saved.");
}

process.exit(dangerous.length > 0 ? 1 : 0);
