/**
 * Mock applications that match the contract. Served by every API route when USE_MOCKS=true.
 *
 * 1. app_hp_setback   heat pump: fails the outdoor setback on v1, passes on resubmit (v2)
 * 2. app_ev_clean     EV charger: clean pass, already approved by an official
 * 3. app_battery_util home battery + solar: triggers the Eversource utility flag
 *
 * Load calc numbers are hand-computed with the NEC 220.83 method in packages/loadcalc.
 * Rule ids for ev_charger / home_battery are placeholders until those packs exist.
 * Citations follow the packs and carry the same VERIFY caveat (see packs/README.md).
 */
import type {
  ApplicationDetail,
  ApplicationVersion,
  CheckResult,
  FileRef,
  HeatPumpPanelFields,
  Recommendation,
} from "@permitpike/contract";

const MODEL = "gemini-2.5-flash";
const BLOB = "https://mock.public.blob.vercel-storage.com/mocks";

function file(id: string, kind: FileRef["kind"], name: string, uploadedAt: string): FileRef {
  return {
    id,
    kind,
    name,
    url: `${BLOB}/${name}`,
    contentType: name.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
    sizeBytes: 250_000,
    uploadedAt,
  };
}

function serviceCapacity(totalAmps: number, ratingAmps: number): CheckResult {
  return {
    ruleId: "shared.service_capacity",
    title: "Service capacity after the new load",
    status: "pass",
    citation: "NEC 220.83",
    message: `Calculated load is ${totalAmps} A on a ${ratingAmps} A service.`,
    suggestedFix: null,
  };
}

// ---------------------------------------------------------------------------
// 1. Heat pump: setback fails on v1, passes on v2
// ---------------------------------------------------------------------------

const HP_ID = "app_hp_setback";

const hpFieldsV1: HeatPumpPanelFields = {
  jobType: "heat_pump_panel",
  serviceVoltage: 240,
  existingServiceAmps: 100,
  existingPanelRatingAmps: 100,
  mainBreakerAmps: 100,
  availableBreakerSpaces: 4,
  panelWorkingClearanceIn: 36,
  existingLoad: {
    dwellingSqFt: 1400,
    smallApplianceCircuits: 2,
    hasLaundryCircuit: true,
    fixedAppliancesVA: 6000,
    existingHvacVA: 0,
    measuredPeakDemandKW: null,
  },
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
};

const hpFieldsV2: HeatPumpPanelFields = { ...hpFieldsV1, outdoorUnitSetbackFt: 6 };

// existing 10,680 VA + heat pump 18 A x 240 V = 4,320 VA -> 15,000 VA / 240 V = 62.5 A
const hpLoadCalc: Recommendation["loadCalc"] = {
  method: "nec_220_83",
  existingLoadVA: 10680,
  addedLoadVA: 4320,
  totalLoadVA: 15000,
  totalAmps: 62.5,
  serviceRatingAmps: 100,
  utilization: 0.625,
  headroomAmps: 37.5,
  passes: true,
};

const hpBreakerCheck: CheckResult = {
  ruleId: "heat_pump_panel.breaker_sizing",
  title: "Breaker matches heat pump nameplate",
  status: "pass",
  citation: "NEC 440.22",
  message: "25 A breaker is within MCA 18 A / MOCP 25 A.",
  suggestedFix: null,
};

const hpChecklist = [
  "Nameplate MCA/MOCP matches the approved spec sheet.",
  "Breaker size matches the approved application.",
  "Disconnect is within sight of the outdoor unit.",
  "Outdoor unit location matches the site plan setback.",
  "Panel directory updated with the new circuit.",
];

const hpTip: Recommendation["cleanEnergyTip"] = {
  message: "Heat pump installs may qualify for Mass Save rebates. Share the link with the homeowner.",
  program: "Mass Save",
  url: "https://www.masssave.com",
};

export const hpVersion1: ApplicationVersion = {
  applicationId: HP_ID,
  version: 1,
  files: [
    file("f_hp_spec", "spec_sheet", "ex-24h-spec.pdf", "2026-11-20T14:00:00.000Z"),
    file("f_hp_panel", "panel_photo", "hp-panel.jpg", "2026-11-20T14:00:00.000Z"),
    file("f_hp_site_v1", "site_plan", "hp-site-plan-v1.pdf", "2026-11-20T14:00:00.000Z"),
  ],
  extraction: {
    fields: hpFieldsV1,
    fieldConfidence: { "heatPump.mcaAmps": 0.97, "heatPump.mocpAmps": 0.97, outdoorUnitSetbackFt: 0.88 },
    missingFields: [],
    model: MODEL,
    extractedAt: "2026-11-20T14:01:10.000Z",
  },
  recommendation: {
    decision: "return_for_fixes",
    confidence: 0.9,
    checks: [
      serviceCapacity(62.5, 100),
      hpBreakerCheck,
      {
        ruleId: "heat_pump_panel.outdoor_setback",
        title: "Outdoor unit setback from property line",
        status: "fail",
        citation: "Boston Zoning Code Art. 10",
        message: "Outdoor unit is 3 ft from the property line; minimum is 5 ft.",
        suggestedFix: "Relocate the outdoor unit at least 5 ft from the property line and update the site plan.",
      },
    ],
    conditions: [],
    loadCalc: hpLoadCalc,
    utilityFlag: null,
    cleanEnergyTip: hpTip,
    inspectorChecklist: hpChecklist,
    summary:
      "Electrical sizing checks pass and the 100 A service has room for the heat pump. The outdoor unit is 3 ft from the property line, under the 5 ft minimum. Recommend returning for a revised site plan.",
    version: 1,
    model: MODEL,
    createdAt: "2026-11-20T14:01:30.000Z",
  },
  note: null,
  submittedAt: "2026-11-20T14:00:00.000Z",
};

/** What the agent returns after the applicant resubmits with the unit moved to 6 ft. */
export const hpVersion2: ApplicationVersion = {
  applicationId: HP_ID,
  version: 2,
  files: [
    file("f_hp_spec", "spec_sheet", "ex-24h-spec.pdf", "2026-11-20T14:00:00.000Z"),
    file("f_hp_panel", "panel_photo", "hp-panel.jpg", "2026-11-20T14:00:00.000Z"),
    file("f_hp_site_v2", "site_plan", "hp-site-plan-v2.pdf", "2026-11-21T09:30:00.000Z"),
  ],
  extraction: {
    fields: hpFieldsV2,
    fieldConfidence: { "heatPump.mcaAmps": 0.97, "heatPump.mocpAmps": 0.97, outdoorUnitSetbackFt: 0.93 },
    missingFields: [],
    model: MODEL,
    extractedAt: "2026-11-21T09:31:00.000Z",
  },
  recommendation: {
    decision: "approve",
    confidence: 0.92,
    checks: [
      serviceCapacity(62.5, 100),
      hpBreakerCheck,
      {
        ruleId: "heat_pump_panel.outdoor_setback",
        title: "Outdoor unit setback from property line",
        status: "pass",
        citation: "Boston Zoning Code Art. 10",
        message: "Outdoor unit is 6 ft from the property line (min 5 ft).",
        suggestedFix: null,
      },
    ],
    conditions: [],
    loadCalc: hpLoadCalc,
    utilityFlag: null,
    cleanEnergyTip: hpTip,
    inspectorChecklist: hpChecklist,
    summary: "Revised site plan moves the outdoor unit to 6 ft. All checks pass. Recommend approval.",
    version: 2,
    model: MODEL,
    createdAt: "2026-11-21T09:31:20.000Z",
  },
  note: "Moved the condenser to the side yard, 6 ft from the lot line. Updated site plan attached.",
  submittedAt: "2026-11-21T09:30:00.000Z",
};

const hpDetail: ApplicationDetail = {
  application: {
    id: HP_ID,
    jobType: "heat_pump_panel",
    address: { street: "48 Brookside Ave", unit: null, neighborhood: "Jamaica Plain", city: "Boston", state: "MA", zip: "02130" },
    applicant: { name: "Dana Ortiz (mock)", company: "Ortiz Electric (mock)", licenseNumber: "MOCK-A-1001" },
    status: "returned",
    submittedAt: hpVersion1.submittedAt,
    decidedAt: "2026-11-20T16:10:00.000Z",
    files: hpVersion1.files,
    extraction: hpVersion1.extraction,
    recommendation: hpVersion1.recommendation,
    version: 1,
  },
  versions: [hpVersion1],
  actions: [
    {
      id: "act_hp_1",
      applicationId: HP_ID,
      version: 1,
      type: "return",
      reason: "Outdoor unit setback is under the minimum.",
      requestedFixes: ["Relocate the outdoor unit at least 5 ft from the property line and update the site plan."],
      actor: { name: "Inspector Lee (mock)", role: "reviewer" },
      timestamp: "2026-11-20T16:10:00.000Z",
    },
  ],
};

// ---------------------------------------------------------------------------
// 2. EV charger: clean pass, approved
// ---------------------------------------------------------------------------

const EV_ID = "app_ev_clean";

const evVersion1: ApplicationVersion = {
  applicationId: EV_ID,
  version: 1,
  files: [
    file("f_ev_spec", "spec_sheet", "ev-charger-spec.pdf", "2026-11-19T18:00:00.000Z"),
    file("f_ev_panel", "panel_photo", "ev-panel.jpg", "2026-11-19T18:00:00.000Z"),
  ],
  extraction: {
    fields: {
      jobType: "ev_charger",
      serviceVoltage: 240,
      existingServiceAmps: 200,
      existingPanelRatingAmps: 200,
      mainBreakerAmps: 200,
      availableBreakerSpaces: 6,
      panelWorkingClearanceIn: 36,
      existingLoad: {
        dwellingSqFt: 2000,
        smallApplianceCircuits: 2,
        hasLaundryCircuit: true,
        fixedAppliancesVA: 9500,
        existingHvacVA: 0,
        measuredPeakDemandKW: null,
      },
      charger: { manufacturer: "Example EV Co.", model: "L2-40", outputAmps: 40, voltage: 240, connection: "receptacle" },
      proposedBreakerAmps: 50,
      conductorAWG: "6",
      installLocation: "garage",
      gfciProtected: true,
      outdoorRated: false,
      hasLoadManagement: false,
      setbackFt: null,
    },
    fieldConfidence: { "charger.outputAmps": 0.98, proposedBreakerAmps: 0.95, gfciProtected: 0.9 },
    missingFields: [],
    model: MODEL,
    extractedAt: "2026-11-19T18:01:00.000Z",
  },
  recommendation: {
    decision: "approve",
    confidence: 0.95,
    checks: [
      serviceCapacity(93.3, 200),
      {
        ruleId: "ev_charger.breaker_125_percent",
        title: "Branch circuit sized for continuous load",
        status: "pass",
        citation: "NEC 625.41",
        message: "50 A breaker is at least 125% of the 40 A charger output (50 A).",
        suggestedFix: null,
      },
      {
        ruleId: "ev_charger.gfci",
        title: "GFCI protection for EV receptacle",
        status: "pass",
        citation: "NEC 625.54",
        message: "Receptacle is on a GFCI breaker.",
        suggestedFix: null,
      },
    ],
    conditions: [],
    // existing 12,800 VA + 40 A x 240 V = 9,600 VA -> 22,400 VA / 240 V = 93.3 A
    loadCalc: {
      method: "nec_220_83",
      existingLoadVA: 12800,
      addedLoadVA: 9600,
      totalLoadVA: 22400,
      totalAmps: 93.3,
      serviceRatingAmps: 200,
      utilization: 0.467,
      headroomAmps: 106.7,
      passes: true,
    },
    utilityFlag: null,
    cleanEnergyTip: {
      message: "Ask the homeowner about scheduling charging off-peak to lower bills.",
      program: null,
      url: null,
    },
    inspectorChecklist: [
      "Charger model matches the approved spec sheet.",
      "50 A GFCI breaker installed and labeled.",
      "Receptacle type matches the charger plug.",
    ],
    summary: "40 A charger on a 50 A GFCI circuit; 200 A service stays under half loaded. All checks pass. Recommend approval.",
    version: 1,
    model: MODEL,
    createdAt: "2026-11-19T18:01:20.000Z",
  },
  note: null,
  submittedAt: "2026-11-19T18:00:00.000Z",
};

const evDetail: ApplicationDetail = {
  application: {
    id: EV_ID,
    jobType: "ev_charger",
    address: { street: "210 Dorchester St", unit: "2", neighborhood: "South Boston", city: "Boston", state: "MA", zip: "02127" },
    applicant: { name: "Sam Patel (mock)", company: null, licenseNumber: "MOCK-A-1002" },
    status: "approved",
    submittedAt: evVersion1.submittedAt,
    decidedAt: "2026-11-20T10:15:00.000Z",
    files: evVersion1.files,
    extraction: evVersion1.extraction,
    recommendation: evVersion1.recommendation,
    version: 1,
  },
  versions: [evVersion1],
  actions: [
    {
      id: "act_ev_1",
      applicationId: EV_ID,
      version: 1,
      type: "approve",
      conditions: [],
      note: null,
      actor: { name: "Inspector Lee (mock)", role: "reviewer" },
      timestamp: "2026-11-20T10:15:00.000Z",
    },
  ],
};

// ---------------------------------------------------------------------------
// 3. Home battery + solar: utility flag
// ---------------------------------------------------------------------------

const BAT_ID = "app_battery_util";

const batVersion1: ApplicationVersion = {
  applicationId: BAT_ID,
  version: 1,
  files: [
    file("f_bat_spec", "spec_sheet", "battery-spec.pdf", "2026-11-21T08:00:00.000Z"),
    file("f_bat_panel", "panel_photo", "battery-panel.jpg", "2026-11-21T08:00:00.000Z"),
    file("f_bat_site", "site_plan", "battery-site-plan.pdf", "2026-11-21T08:00:00.000Z"),
  ],
  extraction: {
    fields: {
      jobType: "home_battery",
      serviceVoltage: 240,
      existingServiceAmps: 200,
      existingPanelRatingAmps: 200,
      mainBreakerAmps: 200,
      availableBreakerSpaces: 3,
      panelWorkingClearanceIn: 36,
      existingLoad: {
        dwellingSqFt: 1800,
        smallApplianceCircuits: 2,
        hasLaundryCircuit: true,
        fixedAppliancesVA: 7000,
        existingHvacVA: 0,
        measuredPeakDemandKW: null,
      },
      battery: {
        manufacturer: "Example Storage Co.",
        model: "HB-13",
        capacityKWh: 13.5,
        continuousOutputW: 5000,
        ul9540Listed: true,
      },
      hasSolar: true,
      interconnection: "load_side",
      backfeedBreakerAmps: 30,
      installLocation: "garage",
      clearanceToOpeningsFt: 4,
    },
    fieldConfidence: { "battery.ul9540Listed": 0.92, backfeedBreakerAmps: 0.9, hasSolar: 0.99 },
    missingFields: [],
    model: MODEL,
    extractedAt: "2026-11-21T08:01:00.000Z",
  },
  recommendation: {
    decision: "approve_with_conditions",
    confidence: 0.84,
    checks: [
      serviceCapacity(69, 200),
      {
        ruleId: "home_battery.busbar_120_percent",
        title: "Busbar 120% rule for backfed breaker",
        status: "pass",
        citation: "NEC 705.12(B)(3)(2)",
        message: "200 A main + 30 A backfeed = 230 A, within 120% of the 200 A busbar (240 A).",
        suggestedFix: null,
      },
      {
        ruleId: "home_battery.listing",
        title: "Energy storage system is listed",
        status: "pass",
        citation: "NEC 706.5",
        message: "Spec sheet shows UL 9540 listing.",
        suggestedFix: null,
      },
      {
        ruleId: "home_battery.location",
        title: "Install location and clearance to openings",
        status: "pass",
        citation: "780 CMR R328.4",
        message: "Garage install, 4 ft from the nearest door.",
        suggestedFix: null,
      },
    ],
    conditions: ["Eversource interconnection approval must be on file before final inspection."],
    // existing 11,560 VA + 5,000 VA charging -> 16,560 VA / 240 V = 69 A
    loadCalc: {
      method: "nec_220_83",
      existingLoadVA: 11560,
      addedLoadVA: 5000,
      totalLoadVA: 16560,
      totalAmps: 69,
      serviceRatingAmps: 200,
      utilization: 0.345,
      headroomAmps: 131,
      passes: true,
    },
    utilityFlag: {
      utility: "Eversource",
      kind: "interconnection",
      reason: "Battery is paired with existing solar and can export to the grid.",
      action: "Submit an Eversource interconnection application; the system cannot operate until approved.",
    },
    cleanEnergyTip: {
      message: "The homeowner may be able to earn incentives by enrolling the battery in Mass Save ConnectedSolutions.",
      program: "Mass Save ConnectedSolutions",
      url: "https://www.masssave.com",
    },
    inspectorChecklist: [
      "Battery model and UL 9540 label match the approved spec sheet.",
      "30 A backfeed breaker at the opposite end of the busbar from the main.",
      "Clearance to doors and windows matches the site plan.",
      "Eversource interconnection approval on file.",
    ],
    summary:
      "Electrical checks pass. Because the battery is paired with solar it needs Eversource interconnection approval. Recommend approval on that condition.",
    version: 1,
    model: MODEL,
    createdAt: "2026-11-21T08:01:30.000Z",
  },
  note: null,
  submittedAt: "2026-11-21T08:00:00.000Z",
};

const batDetail: ApplicationDetail = {
  application: {
    id: BAT_ID,
    jobType: "home_battery",
    address: { street: "15 Pleasant St", unit: null, neighborhood: "Dorchester", city: "Boston", state: "MA", zip: "02125" },
    applicant: { name: "Jordan Kim (mock)", company: "Bright Volt Electric (mock)", licenseNumber: "MOCK-A-1003" },
    status: "awaiting_official",
    submittedAt: batVersion1.submittedAt,
    decidedAt: null,
    files: batVersion1.files,
    extraction: batVersion1.extraction,
    recommendation: batVersion1.recommendation,
    version: 1,
  },
  versions: [batVersion1],
  actions: [],
};

export const MOCK_APPLICATIONS: ApplicationDetail[] = [hpDetail, evDetail, batDetail];

/**
 * Scripted agent output for resubmits, keyed by application id then version.
 * Used by the mock store so the heat pump demo flips from fail to pass.
 */
export const MOCK_RESUBMISSIONS: Record<string, Record<number, ApplicationVersion>> = {
  [HP_ID]: { 2: hpVersion2 },
};
