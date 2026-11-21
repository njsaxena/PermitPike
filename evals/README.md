# Evals

Labeled cases that pin down what the agent should recommend.

- `cases/*.json`: one `EvalCase` (see the contract) per file: extracted fields in,
  expected decision, failing rule ids and utility flag out.
- `run.ts`: validates every case against the contract (`pnpm evals`). TODO: run the
  agent pipeline on each case and write an `EvalRun` to `eval_runs`, which
  `GET /api/evals` serves.

Every new rule gets at least one case that makes it fail.
