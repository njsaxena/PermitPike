# Rule packs

One pack per job type, holding everything device-specific. The shared load calculation lives in
`packages/loadcalc`.

| File | Job type | Rules |
| --- | --- | ---: |
| `heat_pump_panel.ts` | `heat_pump_panel` | 8 |
| `ev_charger.ts` | `ev_charger` | 5 |
| `home_battery.ts` | `home_battery` | 4 |

## Format (`types.ts`)

```ts
interface RulePack<J extends JobType> {
  jobType: J;
  version: string;                         // bump when rules change
  extraction: { schema; hints: string[] }; // contract Zod schema + Gemini prompt hints
  rules: Rule<J>[];                        // pure functions -> CheckResult
  addedLoads(fields): NewLoad[];           // connected VA (a heat pump with backup strips is two)
  serviceRatingAmps(fields): number;       // existing or proposed service rating
  utilityFlag(fields): UtilityFlag | null; // Eversource follow-up
  cleanEnergyTip(fields): CleanEnergyTip | null;
  inspectorChecklist: string[];            // what the field inspector checks
}

interface Rule<J> {
  id: string;        // "<jobType>.<rule>", stable forever
  title: string;
  citation: string;  // e.g. "NEC 440.22"; required
  check(fields): CheckResult;
}
```

## Writing a rule

1. Build results with `result(this, status, message, suggestedFix)` from `types.ts`, which
   attaches the id, title and citation.
2. Missing input returns `warn`, with a fix telling the applicant what to add.
3. Keep rules pure: same fields in, same result out.
4. Add a test that makes the rule fail.

## Citations

Citations follow NEC 2026 with the Massachusetts amendments (527 CMR 12.00, effective April 24,
2026) and the Boston Zoning Code. NEC 2026 renumbered Article 220 as Article 120 (220.83 is now
120.83). Citations marked `VERIFY` are still to be checked against the printed 2026 book.

## Who runs packs

The agent calls `getPack(jobType)`, runs every rule plus `calculateLoad(...)`, and turns the
results into a `Recommendation`. The check results set the decision; the model writes the summary.
