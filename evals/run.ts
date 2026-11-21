/**
 * Eval runner (STUB). Loads every case in ./cases, validates it against the contract,
 * and runs the deterministic rule packs. TODO: run the full agent pipeline, compare
 * decisions, and write an EvalRun row to eval_runs.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { EvalCase } from "@permitpike/contract";

const dir = join(import.meta.dirname, "cases");
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

let valid = 0;
for (const file of files) {
  const parsed = EvalCase.safeParse(JSON.parse(readFileSync(join(dir, file), "utf8")));
  if (parsed.success) {
    valid++;
    console.log(`ok    ${file}  expects ${parsed.data.expectedDecision}`);
  } else {
    console.log(`FAIL  ${file}`);
    console.log(parsed.error.issues);
  }
}

console.log(`\n${valid}/${files.length} cases match the contract. Pipeline scoring: TODO.`);
if (valid !== files.length) process.exit(1);
