/**
 * Eval runner. Loads every case in ./cases, validates it against the contract, runs the
 * deterministic rule packs, and checks that the failing rule ids and the utility flag
 * match the case. TODO: run the full agent pipeline, compare decisions, and write an
 * EvalRun row to eval_runs.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { EvalCase } from "@permitpike/contract";
import type { ExtractedFields, JobType } from "@permitpike/contract";
import { getPack, type RulePack } from "@permitpike/packs";

const dir = join(import.meta.dirname, "cases");
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

function runPack(fields: ExtractedFields) {
  // Each pack only sees its own job type's fields.
  const pack = getPack(fields.jobType) as unknown as RulePack<JobType>;
  const f = fields as Parameters<typeof pack.serviceRatingAmps>[0];
  const failing = pack.rules.map((r) => r.check(f)).filter((r) => r.status === "fail").map((r) => r.ruleId);
  return { failing: failing.sort(), utilityFlag: pack.utilityFlag(f) !== null };
}

let valid = 0;
for (const file of files) {
  const parsed = EvalCase.safeParse(JSON.parse(readFileSync(join(dir, file), "utf8")));
  if (!parsed.success) {
    console.log(`FAIL  ${file}`);
    console.log(parsed.error.issues);
    continue;
  }
  const c = parsed.data;
  const got = runPack(c.fields);
  const want = [...c.expectedFailingRuleIds].sort();
  const problems: string[] = [];
  if (got.failing.join(",") !== want.join(",")) {
    problems.push(`failing rules: expected [${want.join(", ")}], got [${got.failing.join(", ")}]`);
  }
  if (got.utilityFlag !== c.expectUtilityFlag) problems.push(`utility flag: expected ${c.expectUtilityFlag}, got ${got.utilityFlag}`);
  if (c.expectedDecision === "approve" && got.failing.length > 0) problems.push("expects approve but rules fail");
  if (problems.length) {
    console.log(`FAIL  ${file}`);
    for (const p of problems) console.log(`      ${p}`);
    continue;
  }
  valid++;
  console.log(`ok    ${file}  expects ${c.expectedDecision}`);
}

console.log(`\n${valid}/${files.length} cases match the contract and the rule packs. Pipeline scoring: TODO.`);
if (valid !== files.length) process.exit(1);
