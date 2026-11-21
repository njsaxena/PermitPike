import type { EvalRun } from "@permitpike/contract";

export const MOCK_EVAL_RUNS: EvalRun[] = [
  {
    id: "eval_mock_2",
    ranAt: "2026-11-21T09:00:00.000Z",
    gitSha: null,
    model: "gemini-2.5-flash",
    totalCases: 3,
    passedCases: 3,
    results: [
      { caseId: "hp_setback_fail", jobType: "heat_pump_panel", expectedDecision: "return_for_fixes", actualDecision: "return_for_fixes", passed: true, notes: null },
      { caseId: "ev_clean_pass", jobType: "ev_charger", expectedDecision: "approve", actualDecision: "approve", passed: true, notes: null },
      { caseId: "battery_solar_flag", jobType: "home_battery", expectedDecision: "approve_with_conditions", actualDecision: "approve_with_conditions", passed: true, notes: null },
    ],
  },
  {
    id: "eval_mock_1",
    ranAt: "2026-11-20T21:00:00.000Z",
    gitSha: null,
    model: "gemini-2.5-flash",
    totalCases: 3,
    passedCases: 2,
    results: [
      { caseId: "hp_setback_fail", jobType: "heat_pump_panel", expectedDecision: "return_for_fixes", actualDecision: "approve", passed: false, notes: "Setback not extracted from site plan." },
      { caseId: "ev_clean_pass", jobType: "ev_charger", expectedDecision: "approve", actualDecision: "approve", passed: true, notes: null },
      { caseId: "battery_solar_flag", jobType: "home_battery", expectedDecision: "approve_with_conditions", actualDecision: "approve_with_conditions", passed: true, notes: null },
    ],
  },
];
