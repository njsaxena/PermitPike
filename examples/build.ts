/**
 * Builds the example permit library: five permit requests and their documents, for
 * applicants to start a real filing from. Only the request is written: what PermitPike
 * finds and what an official decides happen when the permit is filed.
 *
 *   pnpm examples            (from the repo root)
 *
 * Writes web/public/examples/library.json (the requests) and one folder of documents per
 * example, with a PNG of the first page of each PDF to look through before filing.
 * Load calcs come from packages/loadcalc and heat pump checks from packs/heat_pump_panel.
 * EV charger and home battery checks are written here until those packs exist; their
 * rule ids match the ones in web/mocks so they stay stable when the packs land.
 * Documents are rendered with headless Chrome (set CHROME_PATH if it isn't in /Applications).
 *
 * Every person, company, product and document is fictional.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ApplicationDetail,
  approvalExpiresAt,
  LoadCalcResult,
  type Address,
  type Applicant,
  type ApplicationVersion,
  type CheckResult,
  type CleanEnergyTip,
  type EvChargerFields,
  type ExistingAppliance,
  type ExtractedFields,
  type FileKind,
  type FileRef,
  type HeatPumpPanelFields,
  type HomeBatteryFields,
  type JobType,
  type LoadCalcOutcome,
  type NewLoad,
  type Recommendation,
  type RecommendationDecision,
  type ReviewerAction,
  type UtilityFlag,
} from "../packages/contract/index";
import { calculateLoad } from "../packages/loadcalc/index";
import { heatPumpPanelPack } from "../packs/heat_pump_panel";
import { result } from "../packs/types";
import {
  fillPanel,
  PANEL_WIDTH,
  panelPhotoHeight,
  panelPhotoHtml,
  sitePlanHtml,
  specSheetHtml,
  type Breaker,
  type PanelPhoto,
  type SitePlan,
  type SpecSheet,
} from "./documents";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "web/public/examples");
/** FileRef.url must be absolute. The web app serves web/public at its root. */
const ORIGIN = (process.env.EXAMPLES_ORIGIN ?? "http://localhost:3100").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const MODEL = "gemini-2.5-flash";
const REVIEWER = { name: "M. Okafor (example)", role: "reviewer" as const };

// ---------------------------------------------------------------------------
// Library shape (web/public/examples/library.json)
// ---------------------------------------------------------------------------

/** An example as the build assembles it. Only its request and documents are written (toRequest). */
interface LibraryExample {
  slug: string;
  title: string;
  /** One line: what this example shows in a demo. */
  demonstrates: string;
  highlights: string[];
  detail: ApplicationDetail;
  /**
   * Only for service upgrades: the load calc against the existing service, which is why
   * the upgrade is needed. The recommendation's own load calc uses the proposed service.
   */
  existingServiceLoadCalc: LoadCalcResult | null;
}

/** One example as library.json stores it: what the electrician files, nothing about how it goes. */
export interface ExampleRequest {
  slug: string;
  jobType: JobType;
  address: Address;
  estimatedProjectCost: number;
  jobDescription: string;
  /** The documents of the first submission. */
  files: FileRef[];
}

export interface ExampleLibrary {
  note: string;
  examples: ExampleRequest[];
}

/** What the electrician types on the form for each example. */
const TYPED: Record<string, { cost: number; description: string }> = {
  "ev-garage-clean": {
    cost: 2400,
    description: "Hardwired 48 A Level 2 EV charger in the attached garage on a new 60 A circuit.",
  },
  "heat-pump-service-upgrade": {
    cost: 28500,
    description: "Cold-climate heat pump, with the service upgraded from 100 A to 200 A and a new 200 A panel.",
  },
  "heat-pump-setback-resubmit": {
    cost: 16800,
    description: "Heat pump outdoor unit beside the house on a new 25 A circuit. No panel change.",
  },
  "ev-triple-decker-load-management": {
    cost: 6900,
    description: "40 A EV charger on the outside wall of a triple-decker, with a load manager so the 100 A service isn't exceeded.",
  },
  "battery-solar-busbar": {
    cost: 14200,
    description: "Home battery in the basement, tied to the existing solar through a 60 A backfeed breaker in the main panel.",
  },
};

function toRequest(ex: LibraryExample): ExampleRequest {
  const app = ex.detail.application;
  const typed = TYPED[ex.slug];
  if (!typed) throw new Error(`${ex.slug}: no cost and description in TYPED`);
  return {
    slug: ex.slug,
    jobType: app.jobType,
    address: app.address,
    estimatedProjectCost: typed.cost,
    jobDescription: typed.description,
    files: ex.detail.versions[0]!.files,
  };
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

type Doc =
  | { kind: FileKind; name: string; format: "pdf"; html: string; landscape?: boolean }
  | { kind: FileKind; name: string; format: "jpg"; html: string; height: number };

function render(slug: string, id: string, doc: Doc, uploadedAt: string, work: string): FileRef {
  const dir = join(OUT, slug);
  mkdirSync(dir, { recursive: true });
  const target = join(dir, doc.name);
  const htmlPath = join(work, `${slug}-${doc.name}.html`);
  writeFileSync(htmlPath, doc.html);
  const common = ["--headless", "--disable-gpu", "--hide-scrollbars", `--user-data-dir=${join(work, "chrome")}`];
  if (doc.format === "pdf") {
    execFileSync(CHROME, [...common, "--no-pdf-header-footer", `--print-to-pdf=${target}`, `file://${htmlPath}`], { stdio: "ignore" });
    // The first page as an image, to look through on the filing screen.
    const preview = target.replace(/\.pdf$/, ".png");
    execFileSync("sips", ["-s", "format", "png", "-Z", "1600", target, "--out", preview], { stdio: "ignore" });
  } else {
    const png = join(work, `${slug}-${doc.name}.png`);
    execFileSync(CHROME, [...common, `--window-size=${PANEL_WIDTH},${doc.height}`, `--screenshot=${png}`, `file://${htmlPath}`], { stdio: "ignore" });
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "78", png, "--out", target], { stdio: "ignore" });
  }
  return {
    id,
    kind: doc.kind,
    name: doc.name,
    url: `${ORIGIN}/examples/${slug}/${doc.name}`,
    contentType: doc.format === "pdf" ? "application/pdf" : "image/jpeg",
    sizeBytes: statSync(target).size,
    uploadedAt,
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface House {
  squareFeet: number;
  smallApplianceCircuits: number;
  hasLaundryCircuit: boolean;
  appliances: ExistingAppliance[];
}

function existingLoad(h: House) {
  const va = (a: ExistingAppliance) => a.watts ?? (a.amps ?? 0) * (a.volts ?? 0);
  return {
    dwellingSqFt: h.squareFeet,
    smallApplianceCircuits: h.smallApplianceCircuits,
    hasLaundryCircuit: h.hasLaundryCircuit,
    fixedAppliancesVA: h.appliances.filter((a) => !a.isHeatingOrCooling).reduce((n, a) => n + va(a), 0),
    existingHvacVA: h.appliances.filter((a) => a.isHeatingOrCooling).reduce((n, a) => n + va(a), 0),
    measuredPeakDemandKW: null,
  };
}

function loadCalc(h: House, ratingAmps: number, newLoads: NewLoad[]): LoadCalcResult {
  return calculateLoad({
    service: { ratingAmps, voltage: 240 },
    home: {
      squareFeet: h.squareFeet,
      smallApplianceCircuits: h.smallApplianceCircuits,
      laundryCircuits: h.hasLaundryCircuit ? 1 : 0,
      existingAppliances: h.appliances,
    },
    newLoads,
  });
}

/** Same rule the agent workflow will use: any fail returns, any warn or utility flag adds conditions. */
function decide(checks: CheckResult[], flag: UtilityFlag | null): RecommendationDecision {
  if (checks.some((c) => c.status === "fail")) return "return_for_fixes";
  if (flag || checks.some((c) => c.status === "warn")) return "approve_with_conditions";
  return "approve";
}

const at = (iso: string, plusMinutes: number) => new Date(Date.parse(iso) + plusMinutes * 60_000).toISOString();
const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
const pct = (lc: LoadCalcResult) => `${Math.round(lc.percentOfRating)}%`;

interface VersionInput {
  applicationId: string;
  version: number;
  files: FileRef[];
  fields: ExtractedFields;
  fieldConfidence: Record<string, number>;
  missingFields?: string[];
  submittedAt: string;
  note: string | null;
  checks: CheckResult[];
  loadCalc: LoadCalcResult;
  utilityFlag: UtilityFlag | null;
  cleanEnergyTip: CleanEnergyTip | null;
  conditions: string[];
  inspectorChecklist: string[];
  confidence: number;
  summary: string;
}

function version(v: VersionInput): ApplicationVersion {
  const recommendation: Recommendation = {
    decision: decide(v.checks, v.utilityFlag),
    confidence: v.confidence,
    checks: v.checks,
    conditions: v.conditions,
    loadCalc: v.loadCalc,
    utilityFlag: v.utilityFlag,
    cleanEnergyTip: v.cleanEnergyTip,
    inspectorChecklist: v.inspectorChecklist,
    summary: v.summary,
    version: v.version,
    model: MODEL,
    createdAt: at(v.submittedAt, 2),
  };
  return {
    applicationId: v.applicationId,
    version: v.version,
    files: v.files,
    extraction: {
      fields: v.fields,
      fieldConfidence: v.fieldConfidence,
      missingFields: v.missingFields ?? [],
      model: MODEL,
      extractedAt: at(v.submittedAt, 1),
    },
    recommendation,
    note: v.note,
    submittedAt: v.submittedAt,
  };
}

function detail(a: {
  id: string;
  permitNumber: string;
  jobType: JobType;
  address: Address;
  applicant: Applicant;
  status: ApplicationDetail["application"]["status"];
  versions: ApplicationVersion[];
  actions: ReviewerAction[];
}): ApplicationDetail {
  const first = a.versions[0]!;
  const latest = a.versions[a.versions.length - 1]!;
  const decided = a.status === "approved" || a.status === "returned";
  return ApplicationDetail.parse({
    application: {
      id: a.id,
      permitNumber: a.permitNumber,
      // In-memory only (never written), so placeholders for what filing would assign.
      trackingCode: "PP-EXAM-PLE2",
      parcel: null,
      closureRisk: null,
      estimatedProjectCost: null,
      jobDescription: null,
      jobType: a.jobType,
      address: a.address,
      applicantId: "example",
      applicant: a.applicant,
      status: a.status,
      submittedAt: first.submittedAt,
      decidedAt: decided ? a.actions[a.actions.length - 1]!.timestamp : null,
      expiresAt: approvalExpiresAt(a.status, decided ? a.actions[a.actions.length - 1]!.timestamp : null),
      files: latest.files,
      extraction: latest.extraction,
      recommendation: latest.recommendation,
      version: latest.version,
    },
    versions: a.versions,
    actions: a.actions,
  });
}

// ---------------------------------------------------------------------------
// EV charger and home battery checks (until packs/ev_charger.ts and home_battery.ts exist)
// VERIFY every citation below against NEC 2026 + 527 CMR 12.00, as in packs/README.md.
// ---------------------------------------------------------------------------

function evChecks(f: EvChargerFields): CheckResult[] {
  const out: CheckResult[] = [];
  const breaker = { id: "ev_charger.breaker_125_percent", title: "Branch circuit sized for continuous load", citation: "NEC 625.41" };
  const min = f.charger.outputAmps * 1.25;
  out.push(
    f.proposedBreakerAmps >= min
      ? result(breaker, "pass", `${f.proposedBreakerAmps} A breaker is at least 125% of the ${f.charger.outputAmps} A charger output (${min} A).`)
      : result(
          breaker,
          "fail",
          `${f.proposedBreakerAmps} A breaker is under 125% of the ${f.charger.outputAmps} A charger output (${min} A).`,
          `Use a breaker of at least ${Math.ceil(min / 5) * 5} A, or set the charger to a lower output.`,
        ),
  );

  const gfci = { id: "ev_charger.gfci", title: "GFCI / personnel protection", citation: "NEC 625.22; NEC 625.54" };
  if (f.charger.connection === "hardwired") {
    out.push(result(gfci, "pass", "Hardwired charger with listed personnel protection built in."));
  } else if (f.gfciProtected === true) {
    out.push(result(gfci, "pass", "Receptacle is on a GFCI breaker."));
  } else {
    out.push(
      result(gfci, f.gfciProtected === null ? "warn" : "fail", "Documents do not show GFCI protection for the EV receptacle.", "Put the receptacle on a GFCI breaker and note it on the panel schedule."),
    );
  }

  if (f.installLocation === "exterior_wall" || f.installLocation === "pedestal") {
    const outdoor = { id: "ev_charger.outdoor_rated", title: "Charger rated for outdoor install", citation: "NEC 625.50; NEC 110.11" };
    out.push(
      f.outdoorRated
        ? result(outdoor, "pass", "Spec sheet shows an outdoor-rated (Type 4) enclosure.")
        : result(outdoor, f.outdoorRated === null ? "warn" : "fail", "Charger is outdoors but the spec sheet does not show an outdoor rating.", "Use an outdoor-rated charger or move it indoors."),
    );
  }

  if (f.hasLoadManagement) {
    const ems = { id: "ev_charger.load_management", title: "Energy management system caps the charger", citation: "NEC 625.42; NEC 120.7" };
    out.push(result(ems, "pass", "A listed energy management system limits the charger so the service is not overloaded."));
  }
  return out;
}

function batteryChecks(f: HomeBatteryFields): CheckResult[] {
  const out: CheckResult[] = [];
  const busbar = { id: "home_battery.busbar_120_percent", title: "Busbar 120% rule for backfed breaker", citation: "NEC 705.12(B)(3)(2)" };
  if (f.interconnection === "load_side") {
    const limit = f.existingPanelRatingAmps * 1.2;
    if (f.backfeedBreakerAmps === null) {
      out.push(result(busbar, "warn", "Backfeed breaker size is not shown.", "Add the backfeed breaker size to the single-line diagram."));
    } else {
      const sum = f.mainBreakerAmps + f.backfeedBreakerAmps;
      const maxBackfeed = limit - f.mainBreakerAmps;
      out.push(
        sum <= limit
          ? result(busbar, "pass", `${f.mainBreakerAmps} A main + ${f.backfeedBreakerAmps} A backfeed = ${sum} A, within 120% of the ${f.existingPanelRatingAmps} A busbar (${limit} A).`)
          : result(
              busbar,
              "fail",
              `${f.mainBreakerAmps} A main + ${f.backfeedBreakerAmps} A backfeed = ${sum} A, over 120% of the ${f.existingPanelRatingAmps} A busbar (${limit} A).`,
              `Limit the backfeed breaker to ${maxBackfeed} A, downsize the main breaker, or connect on the supply side.`,
            ),
      );
    }
  }

  const listing = { id: "home_battery.listing", title: "Energy storage system is listed", citation: "NEC 706.5" };
  out.push(
    f.battery.ul9540Listed === true
      ? result(listing, "pass", "Spec sheet shows UL 9540 listing.")
      : result(
          listing,
          f.battery.ul9540Listed === null ? "warn" : "fail",
          f.battery.ul9540Listed === null
            ? "Could not find a UL 9540 listing in the documents. The spec sheet lists UL 1973 for the modules only."
            : "Spec sheet says the system is not UL 9540 listed.",
          "Upload the UL 9540 certificate or a spec sheet that shows the system listing.",
        ),
  );

  const location = { id: "home_battery.location", title: "Install location and clearance to openings", citation: "780 CMR R328.4" };
  const allowed = ["garage", "basement", "utility_room", "exterior_wall"].includes(f.installLocation);
  if (!allowed) {
    out.push(result(location, "warn", "Install location is not one the residential code lists for storage systems.", "Move the system to a garage, basement, utility room or exterior wall."));
  } else if (f.clearanceToOpeningsFt === null) {
    out.push(result(location, "warn", "Site plan does not show the distance to doors and windows.", "Add the distance to the nearest door or window."));
  } else if (f.clearanceToOpeningsFt < 3) {
    out.push(result(location, "fail", `System is ${f.clearanceToOpeningsFt} ft from the nearest opening; minimum is 3 ft.`, "Move the system at least 3 ft from doors and windows."));
  } else {
    out.push(result(location, "pass", `${f.installLocation.replace("_", " ")} install, ${f.clearanceToOpeningsFt} ft from the nearest opening.`));
  }
  return out;
}

const evNewLoad = (f: EvChargerFields): NewLoad => ({
  source: "ev_charger",
  name: `EV charger (${f.charger.outputAmps} A)`,
  va: f.charger.outputAmps * f.charger.voltage,
  kind: "evse",
  isHeatingOrCooling: false,
});

const hpNewLoads = (f: HeatPumpPanelFields): NewLoad[] => heatPumpPanelPack.addedLoads(f);

const EV_TIP: CleanEnergyTip = {
  message: "Eversource's EV charger program can rebate the charger and wiring for qualifying homes. Share the link with the homeowner.",
  program: "Eversource EV Charger Program",
  url: "https://www.eversource.com",
};

function hpSpec(model: string, coolingBTU: number, heatingBTU: number, mca: number, mocp: number, doc: string): SpecSheet {
  return {
    brand: "Northfield Climate",
    color: "#0f5f6b",
    product: "Cold-Climate Heat Pump, Outdoor Unit",
    model,
    tagline: "Ducted and ductless cold-climate heat pump. Full heating capacity down to 5 °F.",
    sections: [
      {
        title: "Capacity",
        rows: [
          ["Rated cooling (95 °F)", `${coolingBTU.toLocaleString()} BTU/h`],
          ["Rated heating (47 °F)", `${heatingBTU.toLocaleString()} BTU/h`],
          ["Heating at 5 °F", `${Math.round(heatingBTU * 0.92).toLocaleString()} BTU/h`],
          ["SEER2 / HSPF2", "19.0 / 9.6"],
        ],
      },
      {
        title: "Electrical",
        rows: [
          ["Power supply", "208/240 V, 1 phase, 60 Hz"],
          ["Minimum circuit ampacity (MCA)", `${mca} A`],
          ["Maximum overcurrent protection (MOCP)", `${mocp} A`],
          ["Compressor RLA", `${Math.round(mca * 0.78 * 10) / 10} A`],
          ["Disconnect", "Field supplied, within sight of unit"],
        ],
      },
      {
        title: "Physical",
        rows: [
          ["Dimensions (W × H × D)", "38 × 33 × 14 in"],
          ["Weight", `${120 + Math.round(coolingBTU / 1000)} lb`],
          ["Refrigerant", "R-454B"],
          ["Sound level", "56 dB(A)"],
        ],
      },
      { title: "Certifications", rows: [["Safety", "UL 60335-2-40"], ["Performance", "AHRI certified"], ["Cold climate", "NEEP listed"]] },
    ],
    notes: [
      "Size branch circuit conductors to the MCA. Overcurrent protection must not exceed the MOCP.",
      "Install with at least 12 in clearance behind the unit and 24 in in front of the service panel.",
    ],
    docNumber: doc,
  };
}

function evSpec(model: string, amps: number, breaker: number, outdoor: boolean, doc: string): SpecSheet {
  return {
    brand: "Voltline",
    color: "#2f3fa8",
    product: "HomeDock Level 2 EV Charger",
    model,
    tagline: "Hardwired Level 2 charger for single-family and multi-family homes.",
    sections: [
      {
        title: "Electrical",
        rows: [
          ["Input", "240 V, 1 phase, 60 Hz"],
          ["Maximum continuous output", `${amps} A (${((amps * 240) / 1000).toFixed(1)} kW)`],
          ["Required branch breaker", `${breaker} A, 2-pole`],
          ["Connection", "Hardwired only"],
          ["Supply conductors", breaker <= 50 ? "6 AWG Cu min." : "6 AWG Cu (THHN, 75 °C) min."],
          ["Personnel protection", "Built-in CCID20, auto-retry"],
        ],
      },
      {
        title: "Physical",
        rows: [
          ["Enclosure", outdoor ? "Type 4 (indoor/outdoor)" : "Type 1 (indoor)"],
          ["Cable", "24 ft, SAE J1772"],
          ["Operating temperature", outdoor ? "-30 °C to 50 °C" : "0 °C to 40 °C"],
          ["Dimensions", "14 × 10 × 5 in"],
        ],
      },
      { title: "Load management", rows: [["Output setting", `6 A to ${amps} A in 1 A steps`], ["EMS input", "Dry contact and Modbus, for external energy management"]] },
      { title: "Certifications", rows: [["Safety", "UL 2594, UL 2231-1/-2"], ["Energy", "ENERGY STAR"]] },
    ],
    notes: ["Install per NEC Article 625. Circuit must be dedicated to the charger.", "Output can be lowered at install; the breaker may then be sized to the lower setting."],
    docNumber: doc,
  };
}

// ---------------------------------------------------------------------------
// 1. EV charger, clean approval
// ---------------------------------------------------------------------------

function example1(work: string): LibraryExample {
  const slug = "ev-garage-clean";
  const id = "ex_ev_clean";
  const submittedAt = "2026-11-16T14:05:00.000Z";
  const address: Address = { street: "112 Corey St", unit: null, neighborhood: "West Roxbury", city: "Boston", state: "MA", zip: "02132" };
  const applicant: Applicant = { name: "Rosa Delgado (example)", company: "Delgado Electric (example)", licenseNumber: "EX-A-2001" };
  const house: House = {
    squareFeet: 2400,
    smallApplianceCircuits: 2,
    hasLaundryCircuit: true,
    appliances: [
      { name: "Electric range", watts: 12000, isHeatingOrCooling: false },
      { name: "Clothes dryer", watts: 5000, isHeatingOrCooling: false },
      { name: "Dishwasher", watts: 1200, isHeatingOrCooling: false },
      { name: "Disposal", watts: 800, isHeatingOrCooling: false },
    ],
  };
  const fields: EvChargerFields = {
    jobType: "ev_charger",
    serviceVoltage: 240,
    existingServiceAmps: 200,
    existingPanelRatingAmps: 200,
    mainBreakerAmps: 200,
    availableBreakerSpaces: 8,
    panelWorkingClearanceIn: 36,
    existingLoad: existingLoad(house),
    charger: { manufacturer: "Voltline", model: "HomeDock 48", outputAmps: 48, voltage: 240, connection: "hardwired" },
    proposedBreakerAmps: 60,
    conductorAWG: "6",
    installLocation: "garage",
    gfciProtected: true,
    outdoorRated: false,
    hasLoadManagement: false,
    setbackFt: null,
  };
  const breakers: Breaker[] = [
    { amps: 50, poles: 2, label: "Range" },
    { amps: 30, poles: 2, label: "Dryer" },
    { amps: 20, poles: 1, label: "Dishwasher" },
    { amps: 15, poles: 1, label: "Disposal" },
    { amps: 15, poles: 1, label: "Furnace (gas)" },
  ];
  const panel: PanelPhoto = { brand: "Northgate", busAmps: 200, mainAmps: 200, slots: 40, breakers: fillPanel(40, 8, breakers), caption: `Basement panel, ${address.street}` };
  const site: SitePlan = {
    title: "EV charger location",
    address: `${address.street}, ${address.neighborhood}, MA ${address.zip}`,
    lot: { w: 70, h: 110 },
    street: address.street,
    buildings: [
      { x: 10, y: 34, w: 34, h: 40, label: "House (2 story)" },
      { x: 46, y: 46, w: 20, h: 24, label: "Garage" },
    ],
    panel: { x: 42, y: 50, label: "Panel (basement)", labelLeft: true },
    equipment: { x: 47, y: 47, w: 3, h: 3, label: "EV" },
    run: [{ x: 42, y: 50 }, { x: 46, y: 50 }, { x: 48.5, y: 50 }],
    setback: null,
    opening: null,
    notes: [
      "Voltline HomeDock 48 on garage back wall, 48 in to bottom of unit.",
      "New 60 A 2-pole breaker, 6 AWG Cu THHN in EMT, approx. 22 ft run.",
      "Existing 200 A service and panel unchanged.",
    ],
    drawnBy: applicant.company!,
    date: dateLabel(submittedAt),
    revision: "A",
  };
  const files = [
    render(slug, "f_ex1_spec", { kind: "spec_sheet", name: "spec-sheet.pdf", format: "pdf", html: specSheetHtml(evSpec("HomeDock 48", 48, 60, false, "VL-HD48-SS-0326")) }, submittedAt, work),
    render(slug, "f_ex1_panel", { kind: "panel_photo", name: "panel-photo.jpg", format: "jpg", html: panelPhotoHtml(panel), height: panelPhotoHeight(panel) }, submittedAt, work),
    render(slug, "f_ex1_site", { kind: "site_plan", name: "site-plan.pdf", format: "pdf", html: sitePlanHtml(site) }, submittedAt, work),
  ];
  const lc = loadCalc(house, 200, [evNewLoad(fields)]);
  const checks = [lc.check, ...evChecks(fields)];
  const v1 = version({
    applicationId: id,
    version: 1,
    files,
    fields,
    fieldConfidence: { "charger.outputAmps": 0.98, proposedBreakerAmps: 0.96, availableBreakerSpaces: 0.9, "existingLoad.dwellingSqFt": 0.86 },
    submittedAt,
    note: null,
    checks,
    loadCalc: lc,
    utilityFlag: null,
    cleanEnergyTip: EV_TIP,
    conditions: [],
    inspectorChecklist: [
      "Charger model and output setting match the approved spec sheet (48 A).",
      "60 A 2-pole breaker installed and labeled on the panel directory.",
      "6 AWG copper conductors, run matches the site plan.",
      "Charger mounted on the garage back wall as shown.",
    ],
    confidence: 0.96,
    summary: `48 A hardwired charger on a new 60 A circuit in the garage. The 200 A service is at ${pct(lc)} after the charger. All checks pass. Recommend approval.`,
  });
  return {
    slug,
    title: "EV charger in a garage",
    demonstrates: "The fast path: every check passes and an official approves it in one click.",
    highlights: ["All checks pass", `Load calc fits (${pct(lc)} of 200 A)`, "Approved by an official"],
    detail: detail({
      id,
      permitNumber: "EL-2026-00101",
      jobType: "ev_charger",
      address,
      applicant,
      status: "approved",
      versions: [v1],
      actions: [{ id: "act_ex1_1", applicationId: id, version: 1, type: "approve", conditions: [], note: null, actor: REVIEWER, timestamp: "2026-11-17T10:20:00.000Z" }],
    }),
    existingServiceLoadCalc: null,
  };
}

// ---------------------------------------------------------------------------
// 2. Heat pump with a 100 A -> 200 A service upgrade
// ---------------------------------------------------------------------------

function example2(work: string): LibraryExample {
  const slug = "heat-pump-service-upgrade";
  const id = "ex_hp_upgrade";
  const submittedAt = "2026-11-20T15:30:00.000Z";
  const address: Address = { street: "64 Kittredge St", unit: null, neighborhood: "Roslindale", city: "Boston", state: "MA", zip: "02131" };
  const applicant: Applicant = { name: "Marcus Bell (example)", company: "Bell & Sons Electric (example)", licenseNumber: "EX-A-2002" };
  const house: House = {
    squareFeet: 1800,
    smallApplianceCircuits: 2,
    hasLaundryCircuit: true,
    appliances: [
      { name: "Electric range", watts: 12000, isHeatingOrCooling: false },
      { name: "Clothes dryer", watts: 5600, isHeatingOrCooling: false },
      { name: "Water heater", watts: 4500, isHeatingOrCooling: false },
      { name: "Dishwasher", watts: 1200, isHeatingOrCooling: false },
      { name: "Electric baseboard heat (kept as backup)", watts: 10000, isHeatingOrCooling: true, hvacMode: "heating" },
    ],
  };
  const fields: HeatPumpPanelFields = {
    jobType: "heat_pump_panel",
    serviceVoltage: 240,
    existingServiceAmps: 100,
    existingPanelRatingAmps: 100,
    mainBreakerAmps: 100,
    availableBreakerSpaces: 1,
    panelWorkingClearanceIn: 36,
    existingLoad: existingLoad(house),
    heatPump: { manufacturer: "Northfield Climate", model: "NCH-36X", coolingBTU: 36000, heatingBTU: 38000, voltage: 240, mcaAmps: 35, mocpAmps: 50 },
    proposedBreakerAmps: 50,
    conductorAWG: "8",
    disconnectWithinSight: true,
    outdoorUnitSetbackFt: 9,
    panelUpgrade: { proposedPanelRatingAmps: 200, proposedServiceAmps: 200 },
  };
  const panel: PanelPhoto = {
    brand: "Kessler",
    busAmps: 100,
    mainAmps: 100,
    slots: 20,
    breakers: fillPanel(20, 1, [
      { amps: 50, poles: 2, label: "Range" },
      { amps: 30, poles: 2, label: "Dryer" },
      { amps: 30, poles: 2, label: "Water heater" },
      { amps: 30, poles: 2, label: "Baseboard heat (up)" },
      { amps: 20, poles: 2, label: "Baseboard heat (down)" },
      { amps: 20, poles: 1, label: "Dishwasher" },
    ]),
    caption: `Existing 100 A panel, ${address.street}`,
  };
  const site: SitePlan = {
    title: "Heat pump + 200 A service",
    address: `${address.street}, ${address.neighborhood}, MA ${address.zip}`,
    lot: { w: 50, h: 100 },
    street: address.street,
    buildings: [{ x: 8, y: 28, w: 26, h: 42, label: "House (2 story)" }],
    panel: { x: 32, y: 52, label: "New 200 A panel" },
    equipment: { x: 37, y: 42, w: 4, h: 3, label: "ODU" },
    run: [{ x: 32, y: 52 }, { x: 35.5, y: 52 }, { x: 35.5, y: 43.5 }, { x: 37, y: 43.5 }],
    setback: { side: "right", feet: fields.outdoorUnitSetbackFt! },
    opening: null,
    notes: [
      "Northfield NCH-36X outdoor unit on pad, right side yard.",
      "Disconnect on house wall within sight of the unit.",
      "Replace 100 A panel with 200 A, 40 spaces. New 200 A meter socket and service mast at existing location.",
      "Baseboard heat stays in service as backup.",
    ],
    drawnBy: applicant.company!,
    date: dateLabel(submittedAt),
    revision: "A",
  };
  const files = [
    render(slug, "f_ex2_spec", { kind: "spec_sheet", name: "spec-sheet.pdf", format: "pdf", html: specSheetHtml(hpSpec("NCH-36X", 36000, 38000, 35, 50, "NFC-NCH36X-0426")) }, submittedAt, work),
    render(slug, "f_ex2_panel", { kind: "panel_photo", name: "panel-photo.jpg", format: "jpg", html: panelPhotoHtml(panel), height: panelPhotoHeight(panel) }, submittedAt, work),
    render(slug, "f_ex2_site", { kind: "site_plan", name: "site-plan.pdf", format: "pdf", html: sitePlanHtml(site) }, submittedAt, work),
  ];
  const newLoads = hpNewLoads(fields);
  const lc = loadCalc(house, heatPumpPanelPack.serviceRatingAmps(fields), newLoads);
  const before = loadCalc(house, fields.existingServiceAmps, newLoads);
  const flag = heatPumpPanelPack.utilityFlag(fields);
  const checks = [lc.check, ...heatPumpPanelPack.rules.map((r) => r.check(fields))];
  const v1 = version({
    applicationId: id,
    version: 1,
    files,
    fields,
    fieldConfidence: {
      "heatPump.mcaAmps": 0.97,
      "heatPump.mocpAmps": 0.97,
      outdoorUnitSetbackFt: 0.9,
      "panelUpgrade.proposedServiceAmps": 0.93,
      "existingLoad.existingHvacVA": 0.81,
    },
    submittedAt,
    note: null,
    checks,
    loadCalc: lc,
    utilityFlag: flag,
    cleanEnergyTip: heatPumpPanelPack.cleanEnergyTip(fields),
    conditions: ["Eversource must energize the new 200 A service before the final inspection."],
    inspectorChecklist: [...heatPumpPanelPack.inspectorChecklist, "New 200 A panel and meter socket installed; Eversource release on file."],
    confidence: 0.88,
    summary: `On the existing 100 A service the house would be at ${pct(before)} with the heat pump, so the 200 A upgrade is needed. On the new 200 A service it is at ${pct(lc)}. Breaker and setback checks pass. Recommend approval once Eversource energizes the new service.`,
  });
  return {
    slug,
    title: "Heat pump that needs a bigger service",
    demonstrates: "The worked load calc, why the upgrade is needed, and the hand-off to Eversource.",
    highlights: [`Existing 100 A service: ${pct(before)} (needs upgrade)`, `Proposed 200 A service: ${pct(lc)}`, "Eversource service upgrade flag", "Mass Save tip"],
    detail: detail({ id, permitNumber: "EL-2026-00102", jobType: "heat_pump_panel", address, applicant, status: "awaiting_official", versions: [v1], actions: [] }),
    existingServiceLoadCalc: before,
  };
}

// ---------------------------------------------------------------------------
// 3. Heat pump returned for setback, fixed, approved
// ---------------------------------------------------------------------------

function example3(work: string): LibraryExample {
  const slug = "heat-pump-setback-resubmit";
  const id = "ex_hp_setback";
  const v1At = "2026-11-18T13:00:00.000Z";
  const returnedAt = "2026-11-18T16:40:00.000Z";
  const v2At = "2026-11-19T09:15:00.000Z";
  const approvedAt = "2026-11-19T11:05:00.000Z";
  const address: Address = { street: "28 Brookside Ave", unit: null, neighborhood: "Jamaica Plain", city: "Boston", state: "MA", zip: "02130" };
  const applicant: Applicant = { name: "Dana Ortiz (example)", company: "Ortiz Electric (example)", licenseNumber: "EX-A-2003" };
  const house: House = {
    squareFeet: 1400,
    smallApplianceCircuits: 2,
    hasLaundryCircuit: true,
    appliances: [
      { name: "Clothes dryer", watts: 5000, isHeatingOrCooling: false },
      { name: "Dishwasher", watts: 1000, isHeatingOrCooling: false },
    ],
  };
  const v1Fields: HeatPumpPanelFields = {
    jobType: "heat_pump_panel",
    serviceVoltage: 240,
    existingServiceAmps: 100,
    existingPanelRatingAmps: 100,
    mainBreakerAmps: 100,
    availableBreakerSpaces: 4,
    panelWorkingClearanceIn: 36,
    existingLoad: existingLoad(house),
    heatPump: { manufacturer: "Northfield Climate", model: "NCH-24", coolingBTU: 24000, heatingBTU: 26000, voltage: 240, mcaAmps: 18, mocpAmps: 25 },
    proposedBreakerAmps: 25,
    conductorAWG: "10",
    disconnectWithinSight: true,
    outdoorUnitSetbackFt: 3,
    panelUpgrade: null,
  };
  const v2Fields: HeatPumpPanelFields = { ...v1Fields, outdoorUnitSetbackFt: 6 };
  const panel: PanelPhoto = {
    brand: "Kessler",
    busAmps: 100,
    mainAmps: 100,
    slots: 24,
    breakers: fillPanel(24, 4, [
      { amps: 30, poles: 2, label: "Dryer" },
      { amps: 20, poles: 1, label: "Dishwasher" },
      { amps: 15, poles: 1, label: "Boiler (gas)" },
    ]),
    caption: `Basement panel, ${address.street}`,
  };
  const plan = (setback: number, rev: string, date: string, x: number): SitePlan => ({
    title: "Heat pump outdoor unit",
    address: `${address.street}, ${address.neighborhood}, MA ${address.zip}`,
    lot: { w: 40, h: 90 },
    street: address.street,
    buildings: [{ x: 4, y: 22, w: 24, h: 40, label: "House" }],
    panel: { x: 26, y: 46, label: "Panel" },
    equipment: { x, y: 36, w: 4, h: 3, label: "ODU" },
    run: [{ x: 26, y: 46 }, { x: 29, y: 46 }, { x: 29, y: 37.5 }, { x, y: 37.5 }],
    setback: { side: "right", feet: setback },
    opening: null,
    notes:
      rev === "A"
        ? ["Northfield NCH-24 outdoor unit on wall brackets, right side.", "Disconnect within sight of the unit.", "New 25 A 2-pole breaker, 10 AWG Cu."]
        : [
            "REV B: outdoor unit moved toward the house, now 6 ft from the lot line.",
            "Northfield NCH-24 outdoor unit on ground pad, right side.",
            "Disconnect within sight of the unit.",
            "New 25 A 2-pole breaker, 10 AWG Cu.",
          ],
    drawnBy: applicant.company!,
    date: dateLabel(date),
    revision: rev,
  });
  const spec = render(slug, "f_ex3_spec", { kind: "spec_sheet", name: "spec-sheet.pdf", format: "pdf", html: specSheetHtml(hpSpec("NCH-24", 24000, 26000, 18, 25, "NFC-NCH24-0426")) }, v1At, work);
  const photo = render(slug, "f_ex3_panel", { kind: "panel_photo", name: "panel-photo.jpg", format: "jpg", html: panelPhotoHtml(panel), height: panelPhotoHeight(panel) }, v1At, work);
  const siteA = render(slug, "f_ex3_site_v1", { kind: "site_plan", name: "site-plan-rev-a.pdf", format: "pdf", html: sitePlanHtml(plan(3, "A", v1At, 33)) }, v1At, work);
  const siteB = render(slug, "f_ex3_site_v2", { kind: "site_plan", name: "site-plan-rev-b.pdf", format: "pdf", html: sitePlanHtml(plan(6, "B", v2At, 30)) }, v2At, work);

  const lc = loadCalc(house, heatPumpPanelPack.serviceRatingAmps(v1Fields), hpNewLoads(v1Fields));
  const common = {
    applicationId: id,
    loadCalc: lc,
    utilityFlag: null,
    cleanEnergyTip: heatPumpPanelPack.cleanEnergyTip(v1Fields),
    conditions: [],
    inspectorChecklist: heatPumpPanelPack.inspectorChecklist,
  };
  const v1 = version({
    ...common,
    version: 1,
    files: [spec, photo, siteA],
    fields: v1Fields,
    fieldConfidence: { "heatPump.mcaAmps": 0.97, "heatPump.mocpAmps": 0.97, outdoorUnitSetbackFt: 0.88 },
    submittedAt: v1At,
    note: null,
    checks: [lc.check, ...heatPumpPanelPack.rules.map((r) => r.check(v1Fields))],
    confidence: 0.9,
    summary: `Breaker sizing passes and the 100 A service is at ${pct(lc)} with the heat pump. The outdoor unit is 3 ft from the property line, under the 5 ft minimum. Recommend returning for a revised site plan.`,
  });
  const v2 = version({
    ...common,
    version: 2,
    files: [spec, photo, siteB],
    fields: v2Fields,
    fieldConfidence: { "heatPump.mcaAmps": 0.97, "heatPump.mocpAmps": 0.97, outdoorUnitSetbackFt: 0.94 },
    submittedAt: v2At,
    note: "Moved the outdoor unit to a ground pad 6 ft from the lot line. Revised site plan (Rev B) attached.",
    checks: [lc.check, ...heatPumpPanelPack.rules.map((r) => r.check(v2Fields))],
    confidence: 0.93,
    summary: "Revised site plan moves the outdoor unit to 6 ft from the property line. All checks pass. Recommend approval.",
  });
  return {
    slug,
    title: "Heat pump sent back, fixed, approved",
    demonstrates: "The resubmit loop and the audit trail. The AI recommends; an official returns and approves.",
    highlights: ["v1 fails the 5 ft setback (3 ft)", "Returned by an official", "v2 moves the unit to 6 ft", "Approved on v2"],
    detail: detail({
      id,
      permitNumber: "EL-2026-00103",
      jobType: "heat_pump_panel",
      address,
      applicant,
      status: "approved",
      versions: [v1, v2],
      actions: [
        {
          id: "act_ex3_1",
          applicationId: id,
          version: 1,
          type: "return",
          reason: "Outdoor unit setback is under the 5 ft minimum.",
          requestedFixes: ["Relocate the outdoor unit at least 5 ft from the property line and update the site plan."],
          actor: REVIEWER,
          timestamp: returnedAt,
        },
        { id: "act_ex3_2", applicationId: id, version: 2, type: "approve", conditions: [], note: "Setback fixed on Rev B.", actor: REVIEWER, timestamp: approvedAt },
      ],
    }),
    existingServiceLoadCalc: null,
  };
}

// ---------------------------------------------------------------------------
// 4. EV charger in a triple-decker: tight load, saved by load management
// ---------------------------------------------------------------------------

function example4(work: string): LibraryExample {
  const slug = "ev-triple-decker-load-management";
  const id = "ex_ev_tight";
  const submittedAt = "2026-11-17T19:10:00.000Z";
  const address: Address = { street: "29 Wheatland Ave", unit: "2", neighborhood: "Dorchester", city: "Boston", state: "MA", zip: "02124" };
  const applicant: Applicant = { name: "Priya Raman (example)", company: "Raman Electrical Services (example)", licenseNumber: "EX-A-2004" };
  const house: House = {
    squareFeet: 1150,
    smallApplianceCircuits: 2,
    hasLaundryCircuit: true,
    appliances: [
      { name: "Electric range", watts: 9600, isHeatingOrCooling: false },
      { name: "Clothes dryer", watts: 5000, isHeatingOrCooling: false },
      { name: "Water heater", watts: 4500, isHeatingOrCooling: false },
      { name: "Dishwasher", watts: 1200, isHeatingOrCooling: false },
    ],
  };
  const fields: EvChargerFields = {
    jobType: "ev_charger",
    serviceVoltage: 240,
    existingServiceAmps: 100,
    existingPanelRatingAmps: 100,
    mainBreakerAmps: 100,
    availableBreakerSpaces: 2,
    panelWorkingClearanceIn: 36,
    existingLoad: existingLoad(house),
    charger: { manufacturer: "Voltline", model: "HomeDock 40", outputAmps: 40, voltage: 240, connection: "hardwired" },
    proposedBreakerAmps: 50,
    conductorAWG: "6",
    installLocation: "exterior_wall",
    gfciProtected: true,
    outdoorRated: true,
    hasLoadManagement: true,
    setbackFt: null,
  };
  const panel: PanelPhoto = {
    brand: "Northgate",
    busAmps: 100,
    mainAmps: 100,
    slots: 20,
    breakers: fillPanel(20, 2, [
      { amps: 40, poles: 2, label: "Range" },
      { amps: 30, poles: 2, label: "Dryer" },
      { amps: 30, poles: 2, label: "Water heater" },
      { amps: 20, poles: 1, label: "Dishwasher" },
    ]),
    caption: `Unit 2 panel, basement, ${address.street}`,
  };
  const site: SitePlan = {
    title: "EV charger, Unit 2",
    address: `${address.street}, Unit 2, ${address.neighborhood}, MA ${address.zip}`,
    lot: { w: 36, h: 95 },
    street: address.street,
    buildings: [
      { x: 4, y: 16, w: 24, h: 52, label: "3-family" },
      { x: 29, y: 30, w: 6, h: 60, label: "Drive" },
    ],
    panel: { x: 26, y: 58, label: "Unit 2 panel" },
    equipment: { x: 28, y: 52, w: 2, h: 3, label: "EV" },
    run: [{ x: 26, y: 58 }, { x: 27, y: 58 }, { x: 27, y: 53.5 }, { x: 28, y: 53.5 }],
    setback: null,
    opening: null,
    notes: [
      "Voltline HomeDock 40 (Type 4) on exterior wall at the driveway.",
      "New 50 A 2-pole breaker in Unit 2 panel, 6 AWG Cu in PVC, approx. 18 ft.",
      "Gridwise LoadGuard on Unit 2 service conductors caps the charger so the 100 A service is not exceeded.",
      "Units 1 and 3 not affected.",
    ],
    drawnBy: applicant.company!,
    date: dateLabel(submittedAt),
    revision: "A",
  };
  const ems: SpecSheet = {
    brand: "Gridwise",
    color: "#3f6b2a",
    product: "LoadGuard Energy Management System",
    model: "LG-200",
    tagline: "Watches the service in real time and turns the EV charger down before the main breaker is at risk.",
    sections: [
      { title: "Monitoring", rows: [["Current sensors", "2 split-core CTs on service conductors"], ["Service sizes", "60 A to 200 A, field set"], ["Response time", "Under 2 seconds"]] },
      { title: "Control", rows: [["Controlled load", "1 EV charger (dry contact or Modbus)"], ["Control range", "Off, or 6 A to charger maximum"], ["Fail-safe", "Charger held at 6 A if sensors are lost"]] },
      { title: "Electrical", rows: [["Supply", "120/240 V, 1 phase"], ["Enclosure", "Type 3R"]] },
      { title: "Certifications", rows: [["Power control system", "UL 3141"], ["Energy management equipment", "UL 916"]] },
    ],
    notes: ["Set the service limit to the main breaker rating at install. The setting is locked with a tamper seal."],
    docNumber: "GW-LG200-SS-0226",
  };
  const files = [
    render(slug, "f_ex4_spec", { kind: "spec_sheet", name: "spec-sheet.pdf", format: "pdf", html: specSheetHtml(evSpec("HomeDock 40", 40, 50, true, "VL-HD40-SS-0326")) }, submittedAt, work),
    render(slug, "f_ex4_ems", { kind: "other", name: "load-manager-spec.pdf", format: "pdf", html: specSheetHtml(ems) }, submittedAt, work),
    render(slug, "f_ex4_panel", { kind: "panel_photo", name: "panel-photo.jpg", format: "jpg", html: panelPhotoHtml(panel), height: panelPhotoHeight(panel) }, submittedAt, work),
    render(slug, "f_ex4_site", { kind: "site_plan", name: "site-plan.pdf", format: "pdf", html: sitePlanHtml(site) }, submittedAt, work),
  ];
  const lc = loadCalc(house, 100, [evNewLoad(fields)]);
  const checks = [lc.check, ...evChecks(fields)];
  const conditions = [
    "LoadGuard service limit set to 100 A and sealed; inspector verifies the setting.",
    "Charger stays connected through the LoadGuard. Removing it requires a new permit.",
  ];
  const v1 = version({
    applicationId: id,
    version: 1,
    files,
    fields,
    fieldConfidence: { "charger.outputAmps": 0.97, hasLoadManagement: 0.91, outdoorRated: 0.89, "existingLoad.dwellingSqFt": 0.78 },
    submittedAt,
    note: null,
    checks,
    loadCalc: lc,
    utilityFlag: null,
    cleanEnergyTip: EV_TIP,
    conditions,
    inspectorChecklist: [
      "Charger model matches the approved spec sheet; enclosure is Type 4.",
      "50 A 2-pole breaker in the Unit 2 panel, labeled.",
      "LoadGuard CTs on the Unit 2 service conductors; limit set to 100 A and sealed.",
      "Charger on the exterior wall at the driveway as shown.",
    ],
    confidence: 0.84,
    summary: `The 100 A service is at ${pct(lc)} with the 40 A charger, which is tight. The application includes a load manager that turns the charger down before the service is overloaded, so the service does not need an upgrade. Recommend approval on the condition that the load manager is set and sealed.`,
  });
  return {
    slug,
    title: "EV charger in a triple-decker",
    demonstrates: "A tight service that doesn't need an upgrade, because a load manager caps the charger.",
    highlights: [`Load calc tight (${pct(lc)} of 100 A)`, "Load management tip", "Approved with conditions"],
    detail: detail({
      id,
      permitNumber: "EL-2026-00104",
      jobType: "ev_charger",
      address,
      applicant,
      status: "approved",
      versions: [v1],
      actions: [{ id: "act_ex4_1", applicationId: id, version: 1, type: "approve", conditions, note: null, actor: REVIEWER, timestamp: "2026-11-18T09:45:00.000Z" }],
    }),
    existingServiceLoadCalc: null,
  };
}

// ---------------------------------------------------------------------------
// 5. Home battery with solar: busbar fails, listing missing, interconnection
// ---------------------------------------------------------------------------

function example5(work: string): LibraryExample {
  const slug = "battery-solar-busbar";
  const id = "ex_battery_busbar";
  const submittedAt = "2026-11-21T08:20:00.000Z";
  const address: Address = { street: "18 Williams Ave", unit: null, neighborhood: "Hyde Park", city: "Boston", state: "MA", zip: "02136" };
  const applicant: Applicant = { name: "Theo Nguyen (example)", company: "Harbor Solar & Electric (example)", licenseNumber: "EX-A-2005" };
  const house: House = {
    squareFeet: 1900,
    smallApplianceCircuits: 2,
    hasLaundryCircuit: true,
    appliances: [
      { name: "Electric range", watts: 12000, isHeatingOrCooling: false },
      { name: "Clothes dryer", watts: 5000, isHeatingOrCooling: false },
      { name: "Dishwasher", watts: 1200, isHeatingOrCooling: false },
    ],
  };
  const fields: HomeBatteryFields = {
    jobType: "home_battery",
    serviceVoltage: 240,
    existingServiceAmps: 200,
    existingPanelRatingAmps: 200,
    mainBreakerAmps: 200,
    availableBreakerSpaces: 4,
    panelWorkingClearanceIn: 36,
    existingLoad: existingLoad(house),
    battery: { manufacturer: "Cobalt Bay", model: "CB-15", capacityKWh: 15, continuousOutputW: 11520, ul9540Listed: null },
    hasSolar: true,
    interconnection: "load_side",
    backfeedBreakerAmps: 60,
    installLocation: "basement",
    clearanceToOpeningsFt: 6,
  };
  const panel: PanelPhoto = {
    brand: "Northgate",
    busAmps: 200,
    mainAmps: 200,
    slots: 40,
    breakers: fillPanel(40, 4, [
      { amps: 50, poles: 2, label: "Range" },
      { amps: 30, poles: 2, label: "Dryer" },
      { amps: 20, poles: 1, label: "Dishwasher" },
      { amps: 15, poles: 1, label: "Boiler (gas)" },
    ]),
    caption: `Basement panel, ${address.street}`,
  };
  const site: SitePlan = {
    title: "Home battery, basement",
    address: `${address.street}, ${address.neighborhood}, MA ${address.zip}`,
    lot: { w: 55, h: 105 },
    street: address.street,
    buildings: [{ x: 10, y: 30, w: 30, h: 40, label: "House (basement shown)" }],
    panel: { x: 26, y: 66, label: "Main panel" },
    equipment: { x: 12, y: 58, w: 5, h: 2, label: "ESS" },
    run: [{ x: 26, y: 66 }, { x: 14.5, y: 66 }, { x: 14.5, y: 60 }],
    setback: null,
    opening: { x: 14.5, y: 52, feet: fields.clearanceToOpeningsFt!, label: "basement window" },
    notes: [
      "Cobalt Bay CB-15 battery with built-in inverter, wall mounted in basement.",
      "New 60 A 2-pole backfeed breaker at the bottom of the main panel busbar.",
      "Existing 6.0 kW PV stays on its supply-side connection at the meter, unchanged.",
      "Eversource interconnection application to be filed by installer.",
    ],
    drawnBy: applicant.company!,
    date: dateLabel(submittedAt),
    revision: "A",
  };
  const batterySpec: SpecSheet = {
    brand: "Cobalt Bay",
    color: "#7a2e5c",
    product: "CB-15 Home Battery",
    model: "CB-15",
    tagline: "AC-coupled home battery with built-in inverter. Whole-home backup, solar self-consumption and time-of-use shifting.",
    sections: [
      { title: "Energy", rows: [["Usable capacity", "15.0 kWh"], ["Chemistry", "Lithium iron phosphate"], ["Round-trip efficiency", "90%"]] },
      {
        title: "Electrical",
        rows: [
          ["Nominal voltage", "240 V, split phase"],
          ["Continuous output", "11,520 W (48 A)"],
          ["Peak output (10 s)", "16,000 W"],
          ["Backfeed breaker", "60 A, 2-pole"],
        ],
      },
      { title: "Physical", rows: [["Dimensions", "46 × 30 × 7 in"], ["Weight", "330 lb"], ["Install", "Indoor or outdoor, wall or floor"], ["Enclosure", "Type 3R"]] },
      { title: "Certifications", rows: [["Battery modules", "UL 1973"], ["Inverter", "UL 1741 SB, IEEE 1547-2018"], ["Fire", "Tested to UL 9540A (cell level)"]] },
    ],
    notes: ["Interconnect per NEC 705 and the utility's requirements.", "Allow 3 ft clear from doors and windows."],
    docNumber: "CB-15-SS-0526",
  };
  const files = [
    render(slug, "f_ex5_spec", { kind: "spec_sheet", name: "spec-sheet.pdf", format: "pdf", html: specSheetHtml(batterySpec) }, submittedAt, work),
    render(slug, "f_ex5_panel", { kind: "panel_photo", name: "panel-photo.jpg", format: "jpg", html: panelPhotoHtml(panel), height: panelPhotoHeight(panel) }, submittedAt, work),
    render(slug, "f_ex5_site", { kind: "site_plan", name: "site-plan.pdf", format: "pdf", html: sitePlanHtml(site) }, submittedAt, work),
  ];
  // The battery adds no continuous load to the dwelling.
  const lc = loadCalc(house, 200, [{ source: "home_battery", name: "Home battery", va: 0, kind: "other", isHeatingOrCooling: false }]);
  const checks = [lc.check, ...batteryChecks(fields)];
  const flag: UtilityFlag = {
    utility: "Eversource",
    kind: "interconnection",
    reason: "Battery is paired with existing solar and can export to the grid.",
    action: "Submit an Eversource interconnection application; the system cannot operate until approved.",
  };
  const v1 = version({
    applicationId: id,
    version: 1,
    files,
    fields,
    fieldConfidence: {
      "battery.continuousOutputW": 0.95,
      "battery.ul9540Listed": 0.31,
      backfeedBreakerAmps: 0.93,
      hasSolar: 0.99,
      clearanceToOpeningsFt: 0.87,
    },
    missingFields: ["battery.ul9540Listed"],
    submittedAt,
    note: null,
    checks,
    loadCalc: lc,
    utilityFlag: flag,
    cleanEnergyTip: {
      message: "The homeowner may be able to earn incentives by enrolling the battery in Mass Save ConnectedSolutions.",
      program: "Mass Save ConnectedSolutions",
      url: "https://www.masssave.com",
    },
    conditions: [],
    inspectorChecklist: [
      "Battery model and UL 9540 label match the approved spec sheet.",
      "Backfeed breaker size matches the approved single-line diagram.",
      "Clearance to doors and windows matches the site plan.",
      "Eversource interconnection approval on file.",
    ],
    confidence: 0.86,
    summary:
      "The 60 A backfeed plus the 200 A main is 260 A, over the 240 A the busbar allows, so this needs a fix. The spec sheet lists UL 1973 for the modules but not the UL 9540 system listing, so we could not confirm it. Because the battery is paired with solar it also needs Eversource interconnection approval. Recommend returning for a smaller backfeed breaker and the UL 9540 certificate.",
  });
  return {
    slug,
    title: "Home battery with solar",
    demonstrates: "A failing code check, a field the AI couldn't find and won't guess, and an Eversource interconnection flag.",
    highlights: ["Busbar 120% rule fails (260 A > 240 A)", "UL 9540 listing not found (low confidence)", "Eversource interconnection flag", "Waiting on an official"],
    detail: detail({ id, permitNumber: "EL-2026-00105", jobType: "home_battery", address, applicant, status: "awaiting_official", versions: [v1], actions: [] }),
    existingServiceLoadCalc: null,
  };
}

function main() {
  const work = mkdtempSync(join(tmpdir(), "permitpike-examples-"));
  try {
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
    const examples = [example1(work), example2(work), example3(work), example4(work), example5(work)];


    const library: ExampleLibrary = {
      note: "Example permit requests for PermitPike: what is filed, not what happens to it. Every person, company, product and document is fictional. Built by examples/build.ts.",
      examples: examples.map(toRequest),
    };
    writeFileSync(join(OUT, "library.json"), `${JSON.stringify(library, null, 2)}\n`);
    for (const ex of library.examples) console.log(`${ex.slug.padEnd(34)} ${ex.jobType.padEnd(16)} files ${ex.files.length}`);
    console.log(`Wrote ${join(OUT, "library.json")}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

main();
