/**
 * PermitPike shared contract.
 *
 * The single source of truth for every shape that crosses a boundary:
 * web <-> agent <-> db <-> packs <-> evals.
 *
 * Rules:
 * - Change this file only after announcing it in team chat.
 * - Every schema has a matching inferred type with the same name.
 * - Timestamps are ISO-8601 strings. Lengths are feet, power is VA, current is amps.
 * - The AI only produces a Recommendation. Only a ReviewerAction from a licensed
 *   official moves an application to "approved" or "returned".
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const IsoDateTime = z.iso.datetime({ offset: true });
export type IsoDateTime = z.infer<typeof IsoDateTime>;

export const Confidence = z.number().min(0).max(1);
export type Confidence = z.infer<typeof Confidence>;

export const JobType = z.enum(["heat_pump_panel", "ev_charger", "home_battery"]);
export type JobType = z.infer<typeof JobType>;

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  heat_pump_panel: "Heat pump / panel upgrade",
  ev_charger: "EV charger",
  home_battery: "Home battery",
};

/**
 * Application lifecycle:
 *   submitted -> ai_review -> awaiting_official -> approved
 *                                               -> returned -> (resubmit) -> submitted
 * In product copy: ai_review is "in review", awaiting_official is "recommended"
 * (the agent has posted its recommendation and an official has not acted yet).
 */
export const ApplicationStatus = z.enum([
  "submitted",
  "ai_review",
  "awaiting_official",
  "returned",
  "approved",
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatus>;

export const Address = z.object({
  street: z.string().min(1),
  unit: z.string().nullable(),
  neighborhood: z.string().nullable(),
  city: z.literal("Boston"),
  state: z.literal("MA"),
  zip: z.string().regex(/^\d{5}$/),
});
export type Address = z.infer<typeof Address>;

// ---------------------------------------------------------------------------
// Parcel and zoning (Boston Assessing + parcel and zoning GIS layers, via the
// compliance package's resolve_parcel_zoning lookup). Saved on the application at
// filing so views never query the city again.
// ---------------------------------------------------------------------------

/** 10-digit Boston parcel ID, including any leading zero. */
export const ParcelId = z.string().regex(/^\d{10}$/);
export type ParcelId = z.infer<typeof ParcelId>;

const Position = z.tuple([z.number(), z.number()]);
const LinearRing = z.array(Position).min(4);

/** Parcel boundary as GeoJSON geometry, WGS84 longitude/latitude. */
export const ParcelOutline = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Polygon"), coordinates: z.array(LinearRing).min(1) }),
  z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(z.array(LinearRing).min(1)).min(1) }),
]);
export type ParcelOutline = z.infer<typeof ParcelOutline>;

export const ZoningDistrict = z.object({
  district: z.string().nullable(),
  subdistrict: z.string().nullable(),
  article: z.string().nullable(),
  mapNumber: z.string().nullable(),
  articleUrl: z.string().url().nullable(),
  /** Dimensional tables for the article (setbacks, heights, lot sizes), when published. */
  tablesUrl: z.string().url().nullable(),
});
export type ZoningDistrict = z.infer<typeof ZoningDistrict>;

export const ZoningOverlay = z.object({
  name: z.string(),
  featureName: z.string().nullable(),
  layerUrl: z.string().url(),
  codeUrl: z.string().url().nullable(),
});
export type ZoningOverlay = z.infer<typeof ZoningOverlay>;

export const Parcel = z.object({
  parcelId: ParcelId,
  /** Assessor's address for the parcel, e.g. "210 DORCHESTER ST, SOUTH BOSTON MA 02127". */
  assessorAddress: z.string().nullable(),
  /** Pin position: the outline's centroid. */
  lat: z.number(),
  lng: z.number(),
  /** Null when the city returned no usable boundary. */
  outline: ParcelOutline.nullable(),
  /** "multiple_zones": the parcel spans more than one district. "partial": a layer was incomplete. */
  match: z.enum(["matched", "multiple_zones", "partial"]),
  districts: z.array(ZoningDistrict),
  /** Possible overlay intersections; the official confirms against the signed maps. */
  overlays: z.array(ZoningOverlay),
  retrievedAt: IsoDateTime,
});
export type Parcel = z.infer<typeof Parcel>;

export const ParcelCandidate = z.object({
  parcelId: ParcelId,
  addresses: z.array(z.string()),
});
export type ParcelCandidate = z.infer<typeof ParcelCandidate>;

export const Applicant = z.object({
  name: z.string().min(1),
  company: z.string().nullable(),
  /** Massachusetts electrician license number. */
  licenseNumber: z.string().min(1),
});
export type Applicant = z.infer<typeof Applicant>;

/** A stored applicant. No password: the license number identifies them. */
export const ApplicantRecord = Applicant.extend({
  id: z.string(),
  createdAt: IsoDateTime,
});
export type ApplicantRecord = z.infer<typeof ApplicantRecord>;

// ---------------------------------------------------------------------------
// Files (uploaded to Vercel Blob before the application is created)
// ---------------------------------------------------------------------------

export const FileKind = z.enum([
  "spec_sheet",
  "panel_photo",
  "site_plan",
  "load_calc",
  "other",
]);
export type FileKind = z.infer<typeof FileKind>;

export const FileRef = z.object({
  id: z.string(),
  kind: FileKind,
  name: z.string(),
  /** Public Vercel Blob URL. */
  url: z.string().url(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  uploadedAt: IsoDateTime,
});
export type FileRef = z.infer<typeof FileRef>;

// ---------------------------------------------------------------------------
// Extracted fields (Gemini output, editable by the applicant)
// ---------------------------------------------------------------------------

/** Inputs to the shared load calc that describe the house as it is today. */
export const ExistingLoadInputs = z.object({
  dwellingSqFt: z.number().positive(),
  smallApplianceCircuits: z.number().int().nonnegative(),
  hasLaundryCircuit: z.boolean(),
  /** Sum of nameplate VA for fixed appliances (range, dryer, water heater, ...). */
  fixedAppliancesVA: z.number().nonnegative(),
  /** Existing heating/cooling nameplate VA that stays in service. */
  existingHvacVA: z.number().nonnegative(),
  /** 12 months of utility peak demand, if provided. Enables NEC 2026 120.87 (not yet in loadcalc). */
  measuredPeakDemandKW: z.number().positive().nullable(),
});
export type ExistingLoadInputs = z.infer<typeof ExistingLoadInputs>;

/** Fields every job type shares: the service and the panel it lands in. */
export const ServiceFields = z.object({
  serviceVoltage: z.number().positive(),
  /** Utility service rating in amps. */
  existingServiceAmps: z.number().positive(),
  /** Panel busbar rating in amps. */
  existingPanelRatingAmps: z.number().positive(),
  mainBreakerAmps: z.number().positive(),
  availableBreakerSpaces: z.number().int().nonnegative(),
  /** Front working clearance at the panel, in inches. */
  panelWorkingClearanceIn: z.number().nonnegative().nullable(),
  existingLoad: ExistingLoadInputs,
});
export type ServiceFields = z.infer<typeof ServiceFields>;

export const HeatPumpPanelFields = ServiceFields.extend({
  jobType: z.literal("heat_pump_panel"),
  heatPump: z.object({
    manufacturer: z.string().nullable(),
    model: z.string().nullable(),
    coolingBTU: z.number().positive(),
    heatingBTU: z.number().positive(),
    voltage: z.number().positive(),
    /** Minimum circuit ampacity from the nameplate. */
    mcaAmps: z.number().positive(),
    /** Maximum overcurrent protection from the nameplate. */
    mocpAmps: z.number().positive(),
  }),
  proposedBreakerAmps: z.number().positive(),
  conductorAWG: z.string().nullable(),
  disconnectWithinSight: z.boolean().nullable(),
  /** Outdoor unit distance to the nearest property line. */
  outdoorUnitSetbackFt: z.number().nonnegative().nullable(),
  /** Null when the job does not include a panel/service upgrade. */
  panelUpgrade: z
    .object({
      proposedPanelRatingAmps: z.number().positive(),
      proposedServiceAmps: z.number().positive(),
    })
    .nullable(),
});
export type HeatPumpPanelFields = z.infer<typeof HeatPumpPanelFields>;

export const EvChargerFields = ServiceFields.extend({
  jobType: z.literal("ev_charger"),
  charger: z.object({
    manufacturer: z.string().nullable(),
    model: z.string().nullable(),
    /** Maximum continuous output current. */
    outputAmps: z.number().positive(),
    voltage: z.number().positive(),
    connection: z.enum(["hardwired", "receptacle"]),
  }),
  proposedBreakerAmps: z.number().positive(),
  conductorAWG: z.string().nullable(),
  installLocation: z.enum(["garage", "exterior_wall", "pedestal", "other"]),
  gfciProtected: z.boolean().nullable(),
  outdoorRated: z.boolean().nullable(),
  /** EV energy management system that caps the charger's draw. */
  hasLoadManagement: z.boolean(),
  /** Only for pedestal/driveway installs. */
  setbackFt: z.number().nonnegative().nullable(),
});
export type EvChargerFields = z.infer<typeof EvChargerFields>;

export const HomeBatteryFields = ServiceFields.extend({
  jobType: z.literal("home_battery"),
  battery: z.object({
    manufacturer: z.string().nullable(),
    model: z.string().nullable(),
    capacityKWh: z.number().positive(),
    continuousOutputW: z.number().positive(),
    ul9540Listed: z.boolean().nullable(),
  }),
  hasSolar: z.boolean(),
  interconnection: z.enum(["load_side", "supply_side", "backup_only"]),
  backfeedBreakerAmps: z.number().positive().nullable(),
  installLocation: z.enum(["garage", "basement", "exterior_wall", "utility_room", "other"]),
  /** Distance to the nearest door or operable window. */
  clearanceToOpeningsFt: z.number().nonnegative().nullable(),
});
export type HomeBatteryFields = z.infer<typeof HomeBatteryFields>;

export const ExtractedFields = z.discriminatedUnion("jobType", [
  HeatPumpPanelFields,
  EvChargerFields,
  HomeBatteryFields,
]);
export type ExtractedFields = z.infer<typeof ExtractedFields>;

/** Maps a job type to its field shape: FieldsFor<"ev_charger"> = EvChargerFields. */
export type FieldsFor<J extends JobType> = Extract<ExtractedFields, { jobType: J }>;

/** Gemini extraction output. fieldConfidence keys are dot paths, e.g. "heatPump.mcaAmps". */
export const Extraction = z.object({
  fields: ExtractedFields,
  fieldConfidence: z.record(z.string(), Confidence),
  /** Dot paths Gemini could not find in the documents. */
  missingFields: z.array(z.string()),
  model: z.string(),
  extractedAt: IsoDateTime,
});
export type Extraction = z.infer<typeof Extraction>;

// ---------------------------------------------------------------------------
// Checks, load calc, recommendation
// ---------------------------------------------------------------------------

export const CheckStatus = z.enum(["pass", "fail", "warn"]);
export type CheckStatus = z.infer<typeof CheckStatus>;

export const CheckResult = z.object({
  /** Stable id, "<pack>.<rule>", e.g. "heat_pump_panel.outdoor_setback". */
  ruleId: z.string(),
  title: z.string(),
  status: CheckStatus,
  /** Required on every check, e.g. "NEC 220.83". */
  citation: z.string().min(1),
  message: z.string(),
  /** Null when status is "pass". */
  suggestedFix: z.string().nullable(),
});
export type CheckResult = z.infer<typeof CheckResult>;

// Load calc (packages/loadcalc). Method: existing dwelling optional calculation,
// NEC 2026 120.83, as adopted by 527 CMR 12.00 (effective April 24, 2026).

/**
 * Which season a heating/cooling load runs in. Heating-only and cooling-only loads
 * are noncoincident, so only the larger side counts. "both" (a heat pump) is never omitted.
 */
export const HvacMode = z.enum(["heating", "cooling", "both"]);
export type HvacMode = z.infer<typeof HvacMode>;

/** One existing appliance. Give nameplate watts, or amps and volts. */
export const ExistingAppliance = z
  .object({
    name: z.string().min(1),
    watts: z.number().nonnegative().optional(),
    amps: z.number().nonnegative().optional(),
    volts: z.number().positive().optional(),
    isHeatingOrCooling: z.boolean(),
    /** Only read when isHeatingOrCooling. Defaults to "both" (never omitted). */
    hvacMode: HvacMode.optional(),
  })
  .refine((a) => a.watts !== undefined || (a.amps !== undefined && a.volts !== undefined), {
    message: "Give watts, or both amps and volts",
  });
export type ExistingAppliance = z.infer<typeof ExistingAppliance>;

/**
 * Demand class of an added load. NEC 2026 Table 120.83 applies a different
 * percentage to new EVSE and new central electric resistance heat than to the rest.
 */
export const NewLoadKind = z.enum(["evse", "central_resistance_heat", "other"]);
export type NewLoadKind = z.infer<typeof NewLoadKind>;

/** A load the job adds. va comes from the rule pack's addedLoad(fields). */
export const NewLoad = z.object({
  /** Rule pack that produced this load. */
  source: JobType,
  name: z.string().min(1),
  va: z.number().nonnegative(),
  kind: NewLoadKind,
  isHeatingOrCooling: z.boolean(),
  /** Only read when isHeatingOrCooling. Defaults to "both" (never omitted). */
  hvacMode: HvacMode.optional(),
  /**
   * Whether a load management device could cap this load. Defaults to true for
   * EVSE and false for everything else.
   */
  controllable: z.boolean().optional(),
});
export type NewLoad = z.infer<typeof NewLoad>;

export const LoadCalcInput = z.object({
  service: z.object({
    ratingAmps: z.number().positive(),
    /** Defaults to 240. */
    voltage: z.number().positive().optional(),
  }),
  home: z.object({
    /** Null when the documents don't show it. calculateLoad throws on null. */
    squareFeet: z.number().positive().nullable(),
    /** 20 A small-appliance circuits. Defaults to the code minimum of 2. */
    smallApplianceCircuits: z.number().int().nonnegative().optional(),
    /** Laundry circuits. Defaults to the code minimum of 1. */
    laundryCircuits: z.number().int().nonnegative().optional(),
    existingAppliances: z.array(ExistingAppliance),
  }),
  newLoads: z.array(NewLoad),
});
export type LoadCalcInput = z.infer<typeof LoadCalcInput>;

/** fits: under the tight threshold. tight: over it but within rating. needs_upgrade: over rating. */
export const LoadCalcOutcome = z.enum(["fits", "tight", "needs_upgrade"]);
export type LoadCalcOutcome = z.infer<typeof LoadCalcOutcome>;

/** One line of the worked calculation, so the reviewer UI can show its work. */
export const LoadCalcStep = z.object({
  label: z.string(),
  va: z.number(),
  citation: z.string().min(1),
});
export type LoadCalcStep = z.infer<typeof LoadCalcStep>;

export const LoadCalcResult = z.object({
  /** Existing load after demand factors. */
  existingVA: z.number().nonnegative(),
  /** Added load after demand factors. */
  addedVA: z.number().nonnegative(),
  totalCalculatedVA: z.number().nonnegative(),
  totalAmps: z.number().nonnegative(),
  serviceAmps: z.number().positive(),
  /** totalAmps / serviceAmps x 100. Over 100 means the service is overloaded. */
  percentOfRating: z.number().nonnegative(),
  result: LoadCalcOutcome,
  /** True when result is needs_upgrade: the utility (Eversource) will likely be involved. */
  utilityLikely: z.boolean(),
  /** True when tight or needs_upgrade and capping controllable loads would fit the service. */
  loadManagementTip: z.boolean(),
  steps: z.array(LoadCalcStep),
  check: CheckResult,
});
export type LoadCalcResult = z.infer<typeof LoadCalcResult>;

export const RecommendationDecision = z.enum([
  "approve",
  "approve_with_conditions",
  "return_for_fixes",
]);
export type RecommendationDecision = z.infer<typeof RecommendationDecision>;

export const UtilityFlag = z.object({
  utility: z.literal("Eversource"),
  kind: z.enum(["service_upgrade", "interconnection", "meter_relocation"]),
  reason: z.string(),
  /** What the applicant must do with the utility. */
  action: z.string(),
});
export type UtilityFlag = z.infer<typeof UtilityFlag>;

export const CleanEnergyTip = z.object({
  message: z.string(),
  program: z.string().nullable(),
  url: z.string().url().nullable(),
});
export type CleanEnergyTip = z.infer<typeof CleanEnergyTip>;

/** The agent's advisory output. A human official always makes the final call. */
export const Recommendation = z.object({
  decision: RecommendationDecision,
  confidence: Confidence,
  checks: z.array(CheckResult),
  /** Filled when decision is "approve_with_conditions". */
  conditions: z.array(z.string()),
  loadCalc: LoadCalcResult,
  utilityFlag: UtilityFlag.nullable(),
  cleanEnergyTip: CleanEnergyTip.nullable(),
  inspectorChecklist: z.array(z.string()),
  summary: z.string(),
  /** Application version this recommendation was made for. */
  version: z.number().int().positive(),
  model: z.string(),
  createdAt: IsoDateTime,
});
export type Recommendation = z.infer<typeof Recommendation>;

// ---------------------------------------------------------------------------
// Reviewer actions (append-only audit log)
// ---------------------------------------------------------------------------

export const Actor = z.object({
  name: z.string().min(1),
  role: z.literal("reviewer"),
});
export type Actor = z.infer<typeof Actor>;

const ApproveInput = z.object({
  type: z.literal("approve"),
  /** Conditions the official attaches to the approval (may copy the AI's). */
  conditions: z.array(z.string()),
  note: z.string().nullable(),
});

const ReturnInput = z.object({
  type: z.literal("return"),
  reason: z.string().min(1),
  requestedFixes: z.array(z.string()),
});

/** Official disagrees with the AI recommendation. Reason is required. */
const OverrideInput = z.object({
  type: z.literal("override"),
  reason: z.string().min(1),
  finalDecision: z.enum(["approved", "returned"]),
  /** Checks the official is overruling. */
  overriddenRuleIds: z.array(z.string()),
});

export const ReviewerActionInput = z.discriminatedUnion("type", [
  ApproveInput,
  ReturnInput,
  OverrideInput,
]);
export type ReviewerActionInput = z.infer<typeof ReviewerActionInput>;

const ActionMeta = z.object({
  id: z.string(),
  applicationId: z.string(),
  version: z.number().int().positive(),
  actor: Actor,
  timestamp: IsoDateTime,
});

export const ReviewerAction = z.discriminatedUnion("type", [
  ApproveInput.extend(ActionMeta.shape),
  ReturnInput.extend(ActionMeta.shape),
  OverrideInput.extend(ActionMeta.shape),
]);
export type ReviewerAction = z.infer<typeof ReviewerAction>;

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

/** One submission. Version 1 is the original; each resubmit adds one. */
export const ApplicationVersion = z.object({
  applicationId: z.string(),
  version: z.number().int().positive(),
  files: z.array(FileRef),
  extraction: Extraction.nullable(),
  recommendation: Recommendation.nullable(),
  /** Applicant's note on what changed (resubmits only). */
  note: z.string().nullable(),
  submittedAt: IsoDateTime,
});
export type ApplicationVersion = z.infer<typeof ApplicationVersion>;

/** Current state of an application: the latest version, flattened. */
export const Application = z
  .object({
    id: z.string(),
    /** Human-facing number, e.g. "EL-2026-00042". */
    permitNumber: z.string(),
    jobType: JobType,
    address: Address,
    /** Parcel and zoning saved at filing. Null when the lookup failed or found no single parcel. */
    parcel: Parcel.nullable(),
    applicantId: z.string(),
    /** Snapshot of the applicant at filing time. */
    applicant: Applicant,
    status: ApplicationStatus,
    submittedAt: IsoDateTime,
    decidedAt: IsoDateTime.nullable(),
    files: z.array(FileRef),
    extraction: Extraction.nullable(),
    recommendation: Recommendation.nullable(),
    version: z.number().int().positive(),
  })
  .refine((a) => a.extraction === null || a.extraction.fields.jobType === a.jobType, {
    message: "extraction.fields.jobType must match jobType",
    path: ["extraction", "fields", "jobType"],
  });
export type Application = z.infer<typeof Application>;

export const ApplicationDetail = z.object({
  application: Application,
  versions: z.array(ApplicationVersion),
  /** Oldest first. */
  actions: z.array(ReviewerAction),
});
export type ApplicationDetail = z.infer<typeof ApplicationDetail>;

// ---------------------------------------------------------------------------
// Evals
// ---------------------------------------------------------------------------

/** One labeled test case in /evals/cases. */
export const EvalCase = z.object({
  id: z.string(),
  description: z.string(),
  fields: ExtractedFields,
  expectedDecision: RecommendationDecision,
  expectedFailingRuleIds: z.array(z.string()),
  expectUtilityFlag: z.boolean(),
});
export type EvalCase = z.infer<typeof EvalCase>;

export const EvalCaseResult = z.object({
  caseId: z.string(),
  jobType: JobType,
  expectedDecision: RecommendationDecision,
  actualDecision: RecommendationDecision,
  passed: z.boolean(),
  notes: z.string().nullable(),
});
export type EvalCaseResult = z.infer<typeof EvalCaseResult>;

export const EvalRun = z.object({
  id: z.string(),
  ranAt: IsoDateTime,
  gitSha: z.string().nullable(),
  model: z.string(),
  totalCases: z.number().int().nonnegative(),
  passedCases: z.number().int().nonnegative(),
  results: z.array(EvalCaseResult),
});
export type EvalRun = z.infer<typeof EvalRun>;

// ---------------------------------------------------------------------------
// HTTP API (web, Next.js route handlers)
// ---------------------------------------------------------------------------

export const ApiError = z.object({
  error: z.object({
    code: z.enum(["bad_request", "unauthorized", "not_found", "conflict", "not_implemented", "internal"]),
    message: z.string(),
    issues: z.array(z.unknown()).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

// POST /api/applicants  (creates the applicant, or returns the one with this license number)
export const CreateApplicantRequest = z.object({
  name: z.string().trim().min(1),
  licenseNumber: z.string().trim().min(1),
});
export type CreateApplicantRequest = z.infer<typeof CreateApplicantRequest>;
export const CreateApplicantResponse = z.object({ applicant: ApplicantRecord });
export type CreateApplicantResponse = z.infer<typeof CreateApplicantResponse>;

// POST /api/reviewer/session  (sets an httpOnly cookie with the name)  DELETE clears it
export const CreateReviewerSessionRequest = z.object({
  name: z.string().trim().min(1).max(120),
});
export type CreateReviewerSessionRequest = z.infer<typeof CreateReviewerSessionRequest>;
export const ReviewerSession = z.object({ name: z.string() });
export type ReviewerSession = z.infer<typeof ReviewerSession>;
export const CreateReviewerSessionResponse = z.object({ reviewer: ReviewerSession });
export type CreateReviewerSessionResponse = z.infer<typeof CreateReviewerSessionResponse>;

// POST /api/applications
export const CreateApplicationRequest = z.object({
  applicantId: z.string(),
  jobType: JobType,
  address: Address,
  /** Parcel the applicant confirmed on the map. Omit or null when the map was unavailable. */
  parcelId: ParcelId.nullable().optional(),
  /** Already uploaded to Vercel Blob by the client (POST /api/blob issues upload tokens). */
  files: z.array(FileRef).min(1),
});
export type CreateApplicationRequest = z.infer<typeof CreateApplicationRequest>;
export const CreateApplicationResponse = z.object({ application: Application });
export type CreateApplicationResponse = z.infer<typeof CreateApplicationResponse>;

// GET /api/applications?status=&jobType=   reviewer queue (reviewer cookie required)
// GET /api/applications?applicantId=        "My permits"
// Order: risk (high first) when a recommendation exists, then newest first.
export const ListApplicationsQuery = z.object({
  status: ApplicationStatus.optional(),
  jobType: JobType.optional(),
  applicantId: z.string().optional(),
});
export type ListApplicationsQuery = z.infer<typeof ListApplicationsQuery>;
export const ListApplicationsResponse = z.object({ applications: z.array(Application) });
export type ListApplicationsResponse = z.infer<typeof ListApplicationsResponse>;

// GET /api/applications/:id
export const GetApplicationResponse = ApplicationDetail;
export type GetApplicationResponse = z.infer<typeof GetApplicationResponse>;

// POST /api/applications/:id/resubmit  (only allowed when status is "returned")
export const ResubmitApplicationRequest = z.object({
  /** Must match the application's applicant. */
  applicantId: z.string(),
  files: z.array(FileRef).min(1),
  note: z.string().nullable(),
});
export type ResubmitApplicationRequest = z.infer<typeof ResubmitApplicationRequest>;
export const ResubmitApplicationResponse = z.object({ application: Application });
export type ResubmitApplicationResponse = z.infer<typeof ResubmitApplicationResponse>;

// POST /api/applications/:id/review  (reviewer cookie required; status must be "awaiting_official")
// The actor comes from the reviewer session, never the body.
// 409 conflict when the application changed since the reviewer loaded it.
export const ReviewApplicationRequest = z.object({
  /** Application version the reviewer was looking at. */
  expectedVersion: z.number().int().positive(),
  action: ReviewerActionInput,
});
export type ReviewApplicationRequest = z.infer<typeof ReviewApplicationRequest>;
export const ReviewApplicationResponse = z.object({
  application: Application,
  action: ReviewerAction,
});
export type ReviewApplicationResponse = z.infer<typeof ReviewApplicationResponse>;

// GET /api/parcel?address=&zip=   or   GET /api/parcel?pid=
// Never blocks filing: "unavailable" covers errors and lookups slower than 3 seconds.
export const ParcelLookupQuery = z.union([
  z.object({ pid: ParcelId }),
  z.object({ address: z.string().trim().min(1).max(120), zip: z.string().regex(/^\d{5}$/).optional() }),
]);
export type ParcelLookupQuery = z.infer<typeof ParcelLookupQuery>;
export const ParcelLookupResponse = z.discriminatedUnion("result", [
  z.object({ result: z.literal("found"), parcel: Parcel }),
  z.object({ result: z.literal("ambiguous"), candidates: z.array(ParcelCandidate) }),
  z.object({ result: z.literal("not_found"), message: z.string() }),
  z.object({ result: z.literal("unavailable"), message: z.string() }),
]);
export type ParcelLookupResponse = z.infer<typeof ParcelLookupResponse>;

// GET /api/evals
export const ListEvalsResponse = z.object({ runs: z.array(EvalRun) });
export type ListEvalsResponse = z.infer<typeof ListEvalsResponse>;

/** Route table so web clients and handlers agree on paths and shapes. */
export const API_ROUTES = {
  createApplicant: {
    method: "POST",
    path: "/api/applicants",
    request: CreateApplicantRequest,
    response: CreateApplicantResponse,
  },
  createReviewerSession: {
    method: "POST",
    path: "/api/reviewer/session",
    request: CreateReviewerSessionRequest,
    response: CreateReviewerSessionResponse,
  },
  createApplication: {
    method: "POST",
    path: "/api/applications",
    request: CreateApplicationRequest,
    response: CreateApplicationResponse,
  },
  listApplications: {
    method: "GET",
    path: "/api/applications",
    query: ListApplicationsQuery,
    response: ListApplicationsResponse,
  },
  getApplication: {
    method: "GET",
    path: "/api/applications/:id",
    response: GetApplicationResponse,
  },
  resubmitApplication: {
    method: "POST",
    path: "/api/applications/:id/resubmit",
    request: ResubmitApplicationRequest,
    response: ResubmitApplicationResponse,
  },
  reviewApplication: {
    method: "POST",
    path: "/api/applications/:id/review",
    request: ReviewApplicationRequest,
    response: ReviewApplicationResponse,
  },
  lookupParcel: {
    method: "GET",
    path: "/api/parcel",
    query: ParcelLookupQuery,
    response: ParcelLookupResponse,
  },
  listEvals: {
    method: "GET",
    path: "/api/evals",
    response: ListEvalsResponse,
  },
} as const;

// ---------------------------------------------------------------------------
// Agent API (web -> Mastra agent on Vultr)
// ---------------------------------------------------------------------------

/** Header carrying AGENT_SHARED_SECRET on every web -> agent call. */
export const AGENT_SECRET_HEADER = "x-permitpike-secret";

export const AgentReviewRequest = z.object({
  applicationId: z.string(),
  version: z.number().int().positive(),
  jobType: JobType,
  address: Address,
  files: z.array(FileRef),
  /** Pass to skip Gemini extraction (applicant already confirmed fields). */
  extraction: Extraction.nullable(),
});
export type AgentReviewRequest = z.infer<typeof AgentReviewRequest>;

export const AgentReviewResponse = z.object({
  extraction: Extraction,
  recommendation: Recommendation,
});
export type AgentReviewResponse = z.infer<typeof AgentReviewResponse>;
