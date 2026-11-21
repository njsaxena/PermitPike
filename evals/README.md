# Evals

Labeled cases that pin down what the agent should recommend.

- `cases/*.json`: one `EvalCase` (see the contract) per file: extracted fields in,
  expected decision, failing rule ids and utility flag out.
- `run.ts` (`pnpm evals`): validates every case against the contract, runs the rule
  pack + load calc on it (`reviewFields` in packs), and prints per-check accuracy,
  decision match, dangerous misses (recommended `approve` when the case expects
  `return_for_fixes`) and false flags (fails or utility flags the case doesn't expect).
  With `DATABASE_URL` set it writes one `EvalRun` row to `eval_runs`, which
  `GET /api/evals` serves. Exits 1 on an invalid case or any dangerous miss.

31 cases: 25 heat_pump_panel, 3 ev_charger, 3 home_battery. `hp_setback_fail` +
`hp_setback_resubmit_pass` are the setback example (fails, then passes on resubmit);
`hp_example_service_upgrade` carries the utility flag.

`heat_pump_panel.outdoor_gfci` can only warn: the contract has no GFCI field for heat
pumps, so no case can make it fail.

Every new rule gets at least one case that makes it fail.
