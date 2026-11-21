# Rule packs

One pack per job type. A pack is everything device-specific; the shared load calc
lives in `packages/loadcalc`.

| File                 | Job type          | Status                    |
| -------------------- | ----------------- | ------------------------- |
| `heat_pump_panel.ts` | `heat_pump_panel` | 2 rules stubbed, rest TODO |
| `ev_charger.ts`      | `ev_charger`      | TODO                      |
| `home_battery.ts`    | `home_battery`    | TODO                      |

## Format (`types.ts`)

```ts
interface RulePack<J extends JobType> {
  jobType: J;
  version: string;                         // bump when rules change
  extraction: { schema; hints: string[] }; // contract Zod schema + Gemini prompt hints
  rules: Rule<J>[];                        // pure functions -> CheckResult
  addedLoad(fields): number;               // VA added to the dwelling (connected, before demand factors)
  serviceRatingAmps(fields): number;       // existing or proposed service rating
  utilityFlag(fields): UtilityFlag | null; // Eversource follow-up, if any
  cleanEnergyTip(fields): CleanEnergyTip | null;
  inspectorChecklist: string[];            // what the field inspector checks
}

interface Rule<J> {
  id: string;        // "<jobType>.<rule>", never renamed
  title: string;
  citation: string;  // e.g. "NEC 440.22"; required
  check(fields): CheckResult;
}
```

## Writing a rule

1. Use `result(this, status, message, suggestedFix)` from `types.ts` so the id,
   title and citation are always attached.
2. Missing input -> `warn` with a fix telling the applicant what to add. Never guess.
3. No I/O, no LLM calls, no clocks. Same fields in, same result out.
4. Add an eval case in `/evals/cases` that makes the rule fail.

## Citations

Every citation is a claim the reviewer will read. Anything marked `VERIFY` in a pack
has not been checked against NEC 2026 with Massachusetts amendments (527 CMR 12.00,
effective April 24, 2026) or the Boston Zoning Code. NEC 2026 moved Article 220 to
Article 120 (220.83 is now 120.83); other articles kept their numbers. Clear every `VERIFY` before the demo.

## Who runs packs

The agent (`/agent`) calls `getPack(jobType)`, runs every rule plus
`calculateLoad(...)` from `packages/loadcalc`, and turns the results into a `Recommendation`.
The load calc's `check` is one of the checks. The decision
(approve / approve with conditions / return) comes from the check results; the LLM
writes the summary and never overrides a failing check.
