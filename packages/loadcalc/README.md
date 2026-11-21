# @permitpike/loadcalc

Answers one question: does this home's electrical service have room for the new device(s)?

```ts
import { calculateLoad } from "@permitpike/loadcalc";

const result = calculateLoad({
  service: { ratingAmps: 100 },            // voltage defaults to 240
  home: { squareFeet: 1500, existingAppliances: [{ name: "Range", watts: 12000, isHeatingOrCooling: false }] },
  newLoads: [{ source: "heat_pump_panel", name: "Heat pump", va: 35 * 240, kind: "other", isHeatingOrCooling: true, hvacMode: "both" }],
});
// result.result: "fits" | "tight" | "needs_upgrade"; result.steps shows the work; result.check is a CheckResult
```

Types (`LoadCalcInput`, `NewLoad`, `LoadCalcResult`, ...) live in `packages/contract`.

## Method

527 CMR 12.00 (Massachusetts Electrical Code) adopts **NEC 2026** for permits after
April 24, 2026, with no amendment to the load calc. NEC 2026 moved Article 220 to
Article 120, so the existing-dwelling optional method is **120.83** (was 220.83).

| Step | Rule |
| --- | --- |
| General lighting | 2 VA per sq ft (120.41; was 3 VA in 2023) |
| Small-appliance and laundry circuits | 1,500 VA each; default to the code minimum (2 and 1) when not stated |
| Existing appliances | Nameplate VA (watts, or amps × volts) |
| Heating vs cooling | 120.83: "the larger connected load of air-conditioning or space heating, but not both." The smaller of heating-only vs cooling-only is omitted. `hvacMode: "both"` (heat pumps) sits on both sides, so it always counts |
| Table 120.83 | First 8 kVA of existing + new at 100%, remainder of existing at 40%, new EVSE 80%, new central resistance heat 80%, all other new loads 50% |

Thresholds: over 100% of the rating is `needs_upgrade`. Over 80% is `tight`. The 80% is a
PermitPike setting in `config.ts`, not a code rule.

`loadManagementTip` is true when the result is tight or needs_upgrade and capping the
controllable loads (EVSE by default) with a power control system (120.7, 625.42,
Article 130) would bring the load within the rating.

## Files

- `constants.ts`: every code-derived number, each with its citation
- `config.ts`: product settings (tight threshold, default voltage, common service sizes)
- `index.ts`: `calculateLoad`
- `index.test.ts`: worked examples (`pnpm --filter @permitpike/loadcalc test`)

## Sources and open items

The 120.83 text and Table 120.83 were read from NFPA's 2026 Second Draft public comment
responses for Code-Making Panel 2 (the committee's final revision stage; text carried by
SR-7832), not from the published NFPA 70-2026 book. Confirmed there:

- 2 VA per sq ft, 1,500 VA per small-appliance and laundry circuit (citing 210.11(C)(1)/(2)), nameplate for fixed appliances
- "The larger connected load of air-conditioning or space heating, but not both, shall be used." The proposal to add "in accordance with 120.82(C)" (PC 1480) was rejected.
- Table 120.83 percentages, including new EVSE at 80% (proposals for 100% were rejected)

Still open (TODO-VERIFY in `constants.ts`):

1. Which new loads get unused first-tier VA when existing load is under 8 kVA. The text doesn't say; we pick the most conservative order.
2. Whether a heat pump's backup resistance strips count as "new central electric resistance space heating" (80%). Packs currently send heat pumps as `other` (50%).
3. Not handled yet: 120.87 (measured peak demand), and whether 120.57's 7,200 VA value sets a floor for new EVSE (the draft text available doesn't settle it).
