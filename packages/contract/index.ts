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

export const Applicant = z.object({
  name: z.string().min(1),
  company: z.string().nullable(),
  /** Massachusetts electrician license number. */
  licenseNumber: z.string().min(1),
});
export type Applicant = z.infer<typeof Applicant>;

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
  /** 12 months of utility peak demand, if provided. Enables NEC 220.87. */
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

export const LoadCalcMethod = z.enum(["nec_220_83", "nec_220_87"]);
export type LoadCalcMethod = z.infer<typeof LoadCalcMethod>;

export const LoadCalcResult = z.object({
  method: LoadCalcMethod,
  existingLoadVA: z.number().nonnegative(),
  addedLoadVA: z.number().nonnegative(),
  totalLoadVA: z.number().nonnegative(),
  totalAmps: z.number().nonnegative(),
  serviceRatingAmps: z.number().positive(),
  /** totalAmps / serviceRatingAmps. Over 1 means the service is overloaded. */
  utilization: z.number().nonnegative(),
  headroomAmps: z.number(),
  passes: z.boolean(),
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
    jobType: JobType,
    address: Address,
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
    code: z.enum(["bad_request", "not_found", "conflict", "not_implemented", "internal"]),
    message: z.string(),
    issues: z.array(z.unknown()).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

// POST /api/applications
export const CreateApplicationRequest = z.object({
  jobType: JobType,
  address: Address,
  applicant: Applicant,
  /** Already uploaded to Vercel Blob by the client. */
  files: z.array(FileRef).min(1),
});
export type CreateApplicationRequest = z.infer<typeof CreateApplicationRequest>;
export const CreateApplicationResponse = z.object({ application: Application });
export type CreateApplicationResponse = z.infer<typeof CreateApplicationResponse>;

// GET /api/applications?status=&jobType=
export const ListApplicationsQuery = z.object({
  status: ApplicationStatus.optional(),
  jobType: JobType.optional(),
});
export type ListApplicationsQuery = z.infer<typeof ListApplicationsQuery>;
export const ListApplicationsResponse = z.object({ applications: z.array(Application) });
export type ListApplicationsResponse = z.infer<typeof ListApplicationsResponse>;

// GET /api/applications/:id
export const GetApplicationResponse = ApplicationDetail;
export type GetApplicationResponse = z.infer<typeof GetApplicationResponse>;

// POST /api/applications/:id/resubmit  (only allowed when status is "returned")
export const ResubmitApplicationRequest = z.object({
  files: z.array(FileRef).min(1),
  note: z.string().nullable(),
});
export type ResubmitApplicationRequest = z.infer<typeof ResubmitApplicationRequest>;
export const ResubmitApplicationResponse = z.object({ application: Application });
export type ResubmitApplicationResponse = z.infer<typeof ResubmitApplicationResponse>;

// POST /api/applications/:id/review  (only allowed when status is "awaiting_official")
export const ReviewApplicationRequest = z.object({
  actor: Actor,
  action: ReviewerActionInput,
});
export type ReviewApplicationRequest = z.infer<typeof ReviewApplicationRequest>;
export const ReviewApplicationResponse = z.object({
  application: Application,
  action: ReviewerAction,
});
export type ReviewApplicationResponse = z.infer<typeof ReviewApplicationResponse>;

// GET /api/evals
export const ListEvalsResponse = z.object({ runs: z.array(EvalRun) });
export type ListEvalsResponse = z.infer<typeof ListEvalsResponse>;

/** Route table so web clients and handlers agree on paths and shapes. */
export const API_ROUTES = {
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

// ---------------------------------------------------------------------------
// Permit closure-risk scoring API
// ---------------------------------------------------------------------------

export const PermitRiskBand = z.enum(["low", "medium", "high"]);
export type PermitRiskBand = z.infer<typeof PermitRiskBand>;

export const PermitRiskScoreRequest = z.object({
  workType: z.string().nullable(),
  permitTypeDescr: z.string().nullable(),
  occupancyType: z.string().nullable(),
  zip: z.string().nullable(),
  declaredValuation: z.number().nonnegative().nullable(),
  sqFeet: z.number().nonnegative().nullable(),
  totalFees: z.number().nonnegative().nullable(),
  issuedDate: IsoDateTime,
  expirationDate: IsoDateTime.nullable(),
  description: z.string(),
  /** Computed from this applicant's permits issued strictly before this one. */
  applicantPriorClosureRate: z.number().min(0).max(1),
});
export type PermitRiskScoreRequest = z.infer<typeof PermitRiskScoreRequest>;

export const PermitRiskScoreResponse = z.object({
  riskScore: z.number().min(0).max(1),
  band: PermitRiskBand,
  reasons: z.array(z.string()).max(3),
  modelVersion: z.string(),
});
export type PermitRiskScoreResponse = z.infer<typeof PermitRiskScoreResponse>;

export const PermitRiskHealthResponse = z.object({
  status: z.literal("ok"),
  modelVersion: z.string(),
});
export type PermitRiskHealthResponse = z.infer<typeof PermitRiskHealthResponse>;
