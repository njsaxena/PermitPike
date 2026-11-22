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

### 120.87: measured demand

Used when `home.measuredDemand` is given (square footage isn't needed then).

| Step | Rule |
| --- | --- |
| Existing load | Measured peak × 125%: 12 months of utility data (120.87(1)), or a 30-day recording at 15-minute intervals (the exception) |
| 30-day recording outside heating/cooling season | Adds the larger of the existing heating or cooling load by calculation |
| 30-day recording with solar, wind or any form of peak load shaving | Throws (the exception excludes these) |
| Removed loads (`removedLoads`) | Subtracted at nameplate, after the 125% |
| New loads | 100% of connected VA (no Table 120.83 percentages) |

The inspector confirms 120.87(3), overload protection per 230.90.

Thresholds: over 100% of the rating is `needs_upgrade`; over 80% is `tight`, a PermitPike setting
in `config.ts`.

`loadManagementTip` is true when the result is tight or needs_upgrade and capping the
controllable loads (EVSE by default) with a power control system (120.7, 625.42,
Article 130) would bring the load within the rating.

## Files

- `constants.ts`: every code-derived number, each with its citation
- `config.ts`: product settings (tight threshold, default voltage, common service sizes)
- `index.ts`: `calculateLoad`
- `index.test.ts`: worked examples (`pnpm --filter @permitpike/loadcalc test`)

## Sources and decisions

Code text comes from NFPA's 2026 Second Draft for Code-Making Panel 2, the committee's final
revision stage. It is still to be compared with the printed NFPA 70-2026 book; we found no
Standards Council or appeal action on 120.57, 120.83 or 120.87.
- 120.83 (SR-7832): 2 VA/sq ft, 1,500 VA circuits, nameplates, "the larger connected load of air-conditioning or space heating, but not both". The 120.82(C) wording (PC 1480) was rejected.
- 120.57 (SR-7809): EVSE at nameplate; 7,200 VA only when the nameplate is unknown.
- 120.87 (SR-7849): "The maximum demand at 125 percent plus the new load minus any removed load determined in accordance with Article 120, Parts I, III, and IV does not exceed the ampacity of the feeder or rating of the service." The 30-day exception "shall not be permitted if the feeder or service has a renewable energy system (i.e., solar photovoltaic or wind electric) or employs any form of peak load shaving."

Real-world data: Analyze Boston "Approved Building Permits", electrical permits issued
2020 to Nov 2026, permit comments.

| Question | Decision | Why |
| --- | --- | --- |
| Who gets unused first-tier VA when existing load is under 8 kVA | Existing first, then the lowest-percentage new loads | Most conservative. Only small all-gas units reach it, and the order moves the total by at most about 4.4 A |
| Heat pump backup resistance strips | A separate new load, `kind: "central_resistance_heat"` (80%), `hvacMode: "heating"`, on top of the heat pump (50%). The heat pump pack sends it from `heatPump.backupHeatKW` | About 1 to 2% of 2,058 Boston heat pump permits mention backup heat, but at 5 to 15 kW it is as large as the heat pump. The test shows dropping it turns needs_upgrade into tight |
| EVSE 7,200 VA | Packs pass nameplate; 7,200 VA applies only when the nameplate is unknown | SR-7809. About 92% of the 203 Boston EV permits that state amps are on 40 A circuits or larger, above 7,200 VA anyway |
| New loads under 120.87 | 100% of connected VA | Conservative; avoids mixing 120.83 percentages into a different method |

Other Boston numbers worth knowing: about 7% of 882 EV permits mention a load manager
(DCC units, "load sharing device"); about 11% of EV permits and 14% of heat pump permits
mention a service upgrade or new service.

## Packs

`RulePack.addedLoads(fields)` returns `NewLoad[]`, connected VA. The heat pump pack
returns the heat pump, plus the backup strips when `heatPump.backupHeatKW` is set.
