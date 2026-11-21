/* Hardcoded sample props for the /design showcase only. Not app data. */
import type { CheckResult, EvalCase } from "@permitpike/contract";
import type { DiffRow, FileChipData, PermitSummary, TrailStep } from "@/components/ui";

/** Sorted the way the app lists them: failures first, then warnings, then passes. */
export const CHECKS: Pick<CheckResult, "title" | "status" | "citation" | "message" | "suggestedFix">[] = [
  {
    title: "Breaker within nameplate rating",
    status: "fail",
    citation: "NEC 440.22(A)",
    message:
      "The proposed 50 A breaker is above the outdoor unit's 45 A maximum overcurrent protection (MOCP).",
    suggestedFix: "Use a breaker rated 45 A or less, matching the nameplate MOCP.",
  },
  {
    title: "Disconnect within sight",
    status: "fail",
    citation: "NEC 440.14",
    message: "No disconnect is shown within sight of the outdoor unit.",
    suggestedFix: "Add a fused or non-fused disconnect within 50 ft and in sight of the unit.",
  },
  {
    title: "Working clearance at panel",
    status: "warn",
    citation: "NEC 110.26(A)(1)",
    message: "The panel photo suggests about 30 in. of front clearance; 36 in. is required.",
    suggestedFix: "Confirm clearance on site, or attach a photo with a tape measure in frame.",
  },
  {
    title: "Service load calculation",
    status: "pass",
    citation: "NEC 220.83",
    message: "Calculated load is 162 A on a 200 A service, leaving 38 A of headroom.",
    suggestedFix: null,
  },
];

export const FILES: FileChipData[] = [
  { name: "mitsubishi-puz-a36-spec.pdf", sizeBytes: 1_840_000 },
  { name: "panel-photo-front.jpg", sizeBytes: 3_420_000 },
  { name: "site-plan-118-marlborough.pdf", sizeBytes: 612_000 },
];

export const TRAIL_FILED: TrailStep[] = [
  { id: "filed", label: "Filed", state: "current", timestamp: "2026-11-21 09:14" },
  { id: "checked", label: "Checked", state: "upcoming" },
  { id: "utility", label: "Utility", state: "upcoming" },
  { id: "review", label: "Review", state: "upcoming" },
  { id: "signed", label: "Signed", state: "upcoming" },
];

export const TRAIL_REVIEW: TrailStep[] = [
  { id: "filed", label: "Filed", state: "done", timestamp: "2026-11-21 09:14" },
  { id: "checked", label: "Checked", state: "done", timestamp: "2026-11-21 09:16" },
  { id: "utility", label: "Utility", state: "skipped", note: "Not required" },
  { id: "review", label: "Review", state: "current", note: "With M. Okafor" },
  { id: "signed", label: "Signed", state: "upcoming" },
];

export const TRAIL_RETURNED: TrailStep[] = [
  { id: "filed", label: "Filed", state: "done", timestamp: "2026-11-20 15:47" },
  { id: "checked", label: "Checked", state: "done", timestamp: "2026-11-20 15:49" },
  { id: "utility", label: "Utility", state: "skipped", note: "Not required" },
  { id: "review", label: "Review", state: "returned", note: "2 fixes needed" },
  { id: "signed", label: "Signed", state: "upcoming" },
];

export const TRAIL_SIGNED: TrailStep[] = [
  { id: "filed", label: "Filed", state: "done", timestamp: "2026-11-21 09:14" },
  { id: "checked", label: "Checked", state: "done", timestamp: "2026-11-21 09:16" },
  { id: "utility", label: "Utility", state: "done", timestamp: "2026-11-21 13:02" },
  { id: "review", label: "Review", state: "done", timestamp: "2026-11-22 10:30" },
  { id: "signed", label: "Signed", state: "done", timestamp: "2026-11-22 10:41" },
];

export const DIFF: DiffRow[] = [
  { label: "Proposed breaker", before: "50", after: "45", unit: "A" },
  { label: "Disconnect within sight", before: "No", after: "Yes" },
  { label: "Panel working clearance", before: "30", after: "36", unit: "in" },
  { label: "Conductor", before: "8 AWG", after: "8 AWG" },
  { label: "Outdoor unit setback", before: "6", after: "6", unit: "ft" },
];

export const APPLICATIONS = [
  {
    permit: "EL-2026-04417",
    address: "118 Marlborough St",
    neighborhood: "Back Bay",
    jobType: "heat_pump_panel",
    status: "awaiting_official",
    risk: "med",
    filed: "2026-11-21 09:14",
  },
  {
    permit: "EL-2026-04409",
    address: "52 Pinckney St",
    neighborhood: "Beacon Hill",
    jobType: "ev_charger",
    status: "returned",
    risk: "high",
    filed: "2026-11-20 15:47",
  },
  {
    permit: "EL-2026-04391",
    address: "9 Thwing St",
    neighborhood: "Roxbury",
    jobType: "home_battery",
    status: "approved",
    risk: "low",
    filed: "2026-11-19 11:02",
  },
] as const;

/** Queue samples: a mix of every progress stage, deliberately out of order. */
export const QUEUE: PermitSummary[] = [
  { id: "a1", permitNumber: "EL-2026-04391", street: "9 Thwing St", neighborhood: "Roxbury", jobType: "home_battery", status: "approved", risk: "low", filed: "2026-11-19 11:02", checks: { fail: 0, warn: 0, pass: 5 } },
  { id: "a2", permitNumber: "EL-2026-04417", street: "118 Marlborough St", neighborhood: "Back Bay", jobType: "heat_pump_panel", status: "awaiting_official", risk: "med", filed: "2026-11-21 09:14", checks: { fail: 0, warn: 1, pass: 3 } },
  { id: "a3", permitNumber: "EL-2026-04409", street: "52 Pinckney St", neighborhood: "Beacon Hill", jobType: "ev_charger", status: "returned", risk: "high", filed: "2026-11-20 15:47", checks: { fail: 2, warn: 1, pass: 1 } },
  { id: "a4", permitNumber: "EL-2026-04421", street: "37 Ashford St", neighborhood: "Allston", jobType: "ev_charger", status: "ai_review", risk: "low", filed: "2026-11-21 10:05", checks: { fail: 0, warn: 0, pass: 2 } },
  { id: "a5", permitNumber: "EL-2026-04402", street: "211 Savin Hill Ave", neighborhood: "Dorchester", jobType: "heat_pump_panel", status: "awaiting_official", risk: "low", filed: "2026-11-20 08:31", checks: { fail: 0, warn: 0, pass: 4 } },
  { id: "a6", permitNumber: "EL-2026-04424", street: "14 Monument Sq", neighborhood: "Charlestown", jobType: "home_battery", status: "submitted", risk: "med", filed: "2026-11-21 10:40", checks: {} },
  { id: "a7", permitNumber: "EL-2026-04398", street: "66 Centre St", neighborhood: "Jamaica Plain", jobType: "heat_pump_panel", status: "awaiting_official", risk: "high", filed: "2026-11-19 16:20", checks: { fail: 1, warn: 2, pass: 2 } },
];

/* ---------------------------------------------------------- Example library */

const LOAD_1400 = {
  dwellingSqFt: 1400,
  smallApplianceCircuits: 2,
  hasLaundryCircuit: true,
  fixedAppliancesVA: 6000,
  existingHvacVA: 0,
  measuredPeakDemandKW: null,
};

/** The first is evals/cases/hp_setback_fail.json as written; the rest are illustrative. */
export const EXAMPLES: EvalCase[] = [
  {
    id: "hp_setback_fail",
    description: "Heat pump outdoor unit 3 ft from the property line; everything else passes.",
    fields: {
      jobType: "heat_pump_panel",
      serviceVoltage: 240,
      existingServiceAmps: 100,
      existingPanelRatingAmps: 100,
      mainBreakerAmps: 100,
      availableBreakerSpaces: 4,
      panelWorkingClearanceIn: 36,
      existingLoad: LOAD_1400,
      heatPump: {
        manufacturer: "Example HVAC Co.",
        model: "EX-24H",
        coolingBTU: 24000,
        heatingBTU: 26000,
        voltage: 240,
        mcaAmps: 18,
        mocpAmps: 25,
      },
      proposedBreakerAmps: 25,
      conductorAWG: "10",
      disconnectWithinSight: true,
      outdoorUnitSetbackFt: 3,
      panelUpgrade: null,
    },
    expectedDecision: "return_for_fixes",
    expectedFailingRuleIds: ["heat_pump_panel.outdoor_setback"],
    expectUtilityFlag: false,
  },
  {
    id: "hp_panel_upgrade_pass",
    description: "Heat pump with a 100 A to 200 A panel and service upgrade; all checks pass.",
    fields: {
      jobType: "heat_pump_panel",
      serviceVoltage: 240,
      existingServiceAmps: 100,
      existingPanelRatingAmps: 100,
      mainBreakerAmps: 100,
      availableBreakerSpaces: 0,
      panelWorkingClearanceIn: 36,
      existingLoad: { ...LOAD_1400, dwellingSqFt: 1900, fixedAppliancesVA: 9500 },
      heatPump: {
        manufacturer: "Example HVAC Co.",
        model: "EX-36H",
        coolingBTU: 36000,
        heatingBTU: 38000,
        voltage: 240,
        mcaAmps: 24,
        mocpAmps: 35,
      },
      proposedBreakerAmps: 30,
      conductorAWG: "10",
      disconnectWithinSight: true,
      outdoorUnitSetbackFt: 8,
      panelUpgrade: { proposedPanelRatingAmps: 200, proposedServiceAmps: 200 },
    },
    expectedDecision: "approve",
    expectedFailingRuleIds: [],
    expectUtilityFlag: true,
  },
  {
    id: "ev_garage_load_managed",
    description: "48 A hardwired charger in a garage on a 100 A service, with load management.",
    fields: {
      jobType: "ev_charger",
      serviceVoltage: 240,
      existingServiceAmps: 100,
      existingPanelRatingAmps: 100,
      mainBreakerAmps: 100,
      availableBreakerSpaces: 2,
      panelWorkingClearanceIn: 30,
      existingLoad: LOAD_1400,
      charger: {
        manufacturer: "Example EV Co.",
        model: "Home 48",
        outputAmps: 48,
        voltage: 240,
        connection: "hardwired",
      },
      proposedBreakerAmps: 60,
      conductorAWG: "6",
      installLocation: "garage",
      gfciProtected: true,
      outdoorRated: false,
      hasLoadManagement: true,
      setbackFt: null,
    },
    expectedDecision: "approve_with_conditions",
    expectedFailingRuleIds: ["ev_charger.panel_working_clearance"],
    expectUtilityFlag: false,
  },
  {
    id: "battery_near_window",
    description: "13.5 kWh wall battery 2 ft from an operable window, load-side with solar.",
    fields: {
      jobType: "home_battery",
      serviceVoltage: 240,
      existingServiceAmps: 200,
      existingPanelRatingAmps: 200,
      mainBreakerAmps: 200,
      availableBreakerSpaces: 3,
      panelWorkingClearanceIn: 36,
      existingLoad: { ...LOAD_1400, dwellingSqFt: 2200 },
      battery: {
        manufacturer: "Example Storage Co.",
        model: "Wall 13",
        capacityKWh: 13.5,
        continuousOutputW: 5000,
        ul9540Listed: true,
      },
      hasSolar: true,
      interconnection: "load_side",
      backfeedBreakerAmps: 30,
      installLocation: "exterior_wall",
      clearanceToOpeningsFt: 2,
    },
    expectedDecision: "return_for_fixes",
    expectedFailingRuleIds: ["home_battery.clearance_to_openings"],
    expectUtilityFlag: true,
  },
];

/** Readable titles for the sample rule ids (the real ones come from the rule packs). */
export const EXAMPLE_RULE_TITLES: Record<string, string> = {
  "heat_pump_panel.outdoor_setback": "Outdoor unit setback from property line",
  "ev_charger.panel_working_clearance": "Working clearance in front of the panel",
  "home_battery.clearance_to_openings": "Battery distance from doors and windows",
};

/** The checks hp_setback_fail should produce. Rule ids and citations follow the heat pump pack. */
export const EXAMPLE_CHECKS: CheckResult[] = [
  {
    ruleId: "heat_pump_panel.breaker_sizing",
    title: "Breaker matches heat pump nameplate",
    status: "pass",
    citation: "NEC 440.22",
    message: "25 A breaker is within the nameplate range of 18 A to 25 A.",
    suggestedFix: null,
  },
  {
    ruleId: "heat_pump_panel.outdoor_setback",
    title: "Outdoor unit setback from property line",
    status: "fail",
    citation: "Boston Zoning Code Art. 10",
    message: "The outdoor unit is 3 ft from the property line. It needs at least 5 ft.",
    suggestedFix: "Move the unit at least 5 ft from the property line and update the site plan.",
  },
  {
    ruleId: "heat_pump_panel.disconnect",
    title: "Disconnect within sight of the unit",
    status: "pass",
    citation: "NEC 440.14",
    message: "A disconnect is shown within sight of the outdoor unit.",
    suggestedFix: null,
  },
  {
    ruleId: "heat_pump_panel.conductor",
    title: "Conductor sized for the breaker",
    status: "pass",
    citation: "NEC 310.16",
    message: "10 AWG copper is rated for the 25 A breaker.",
    suggestedFix: null,
  },
  {
    ruleId: "heat_pump_panel.working_clearance",
    title: "Working space in front of the panel",
    status: "pass",
    citation: "NEC 110.26",
    message: "36 in of clear space in front of the panel.",
    suggestedFix: null,
  },
  {
    ruleId: "heat_pump_panel.load_calc",
    title: "Service can carry the new load",
    status: "pass",
    citation: "NEC 120.83",
    message: "With the heat pump the house draws about 68 A of its 100 A service.",
    suggestedFix: null,
  },
];

/** Which check reads each field of hp_setback_fail. */
export const EXAMPLE_FIELD_CHECKS: Record<string, string> = {
  proposedBreakerAmps: "heat_pump_panel.breaker_sizing",
  "heatPump.mcaAmps": "heat_pump_panel.breaker_sizing",
  "heatPump.mocpAmps": "heat_pump_panel.breaker_sizing",
  outdoorUnitSetbackFt: "heat_pump_panel.outdoor_setback",
  disconnectWithinSight: "heat_pump_panel.disconnect",
  conductorAWG: "heat_pump_panel.conductor",
  panelWorkingClearanceIn: "heat_pump_panel.working_clearance",
  existingServiceAmps: "heat_pump_panel.load_calc",
  "existingLoad.dwellingSqFt": "heat_pump_panel.load_calc",
  "existingLoad.fixedAppliancesVA": "heat_pump_panel.load_calc",
};
