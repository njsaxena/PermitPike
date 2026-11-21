/**
 * In-memory mock store behind USE_MOCKS=true.
 * State lives on globalThis so it survives dev hot reloads; it resets on server
 * restart and is not shared across serverless instances. Demo use only.
 */
import {
  Application,
  ApplicationDetail,
  type ApplicationVersion,
  type CreateApplicationRequest,
  type ListApplicationsQuery,
  type ResubmitApplicationRequest,
  type ReviewApplicationRequest,
  type ReviewerAction,
} from "@permitpike/contract";
import { MOCK_APPLICATIONS, MOCK_RESUBMISSIONS } from "./applications";

type Store = Map<string, ApplicationDetail>;
type MockResult<T> = { ok: true; value: T } | { ok: false; code: "not_found" | "conflict"; message: string };

const globalForMocks = globalThis as unknown as { permitpikeMockStore?: Store };

function store(): Store {
  if (!globalForMocks.permitpikeMockStore) {
    // Parse on load so contract drift breaks loudly here, not in the UI.
    const details = MOCK_APPLICATIONS.map((d) => ApplicationDetail.parse(structuredClone(d)));
    globalForMocks.permitpikeMockStore = new Map(details.map((d) => [d.application.id, d]));
  }
  return globalForMocks.permitpikeMockStore;
}

const now = () => new Date().toISOString();

function flatten(app: Application, v: ApplicationVersion): Application {
  return {
    ...app,
    version: v.version,
    files: v.files,
    extraction: v.extraction,
    recommendation: v.recommendation,
  };
}

export function listApplications(query: ListApplicationsQuery): Application[] {
  return [...store().values()]
    .map((d) => d.application)
    .filter((a) => (query.status ? a.status === query.status : true))
    .filter((a) => (query.jobType ? a.jobType === query.jobType : true))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function getApplication(id: string): ApplicationDetail | undefined {
  return store().get(id);
}

export function createApplication(req: CreateApplicationRequest): Application {
  const id = `app_mock_${store().size + 1}`;
  const submittedAt = now();
  const version: ApplicationVersion = {
    applicationId: id,
    version: 1,
    files: req.files,
    extraction: null,
    recommendation: null,
    note: null,
    submittedAt,
  };
  const application: Application = {
    id,
    jobType: req.jobType,
    address: req.address,
    applicant: req.applicant,
    status: "submitted",
    submittedAt,
    decidedAt: null,
    files: req.files,
    extraction: null,
    recommendation: null,
    version: 1,
  };
  store().set(id, { application, versions: [version], actions: [] });
  return application;
}

export function resubmitApplication(id: string, req: ResubmitApplicationRequest): MockResult<Application> {
  const detail = store().get(id);
  if (!detail) return { ok: false, code: "not_found", message: `No application ${id}` };
  if (detail.application.status !== "returned") {
    return { ok: false, code: "conflict", message: "Only returned applications can be resubmitted." };
  }

  const nextVersion = detail.application.version + 1;
  const scripted = MOCK_RESUBMISSIONS[id]?.[nextVersion];
  const version: ApplicationVersion = scripted
    ? { ...scripted, files: req.files, note: req.note, submittedAt: now() }
    : {
        applicationId: id,
        version: nextVersion,
        files: req.files,
        extraction: detail.application.extraction,
        recommendation: null,
        note: req.note,
        submittedAt: now(),
      };

  const application = flatten(
    {
      ...detail.application,
      // Scripted versions already carry the agent's recommendation.
      status: version.recommendation ? "awaiting_official" : "submitted",
      decidedAt: null,
    },
    version,
  );
  store().set(id, { ...detail, application, versions: [...detail.versions, version] });
  return { ok: true, value: application };
}

export function reviewApplication(
  id: string,
  req: ReviewApplicationRequest,
): MockResult<{ application: Application; action: ReviewerAction }> {
  const detail = store().get(id);
  if (!detail) return { ok: false, code: "not_found", message: `No application ${id}` };
  if (detail.application.status !== "awaiting_official") {
    return { ok: false, code: "conflict", message: "Only applications awaiting an official can be reviewed." };
  }

  const timestamp = now();
  const action: ReviewerAction = {
    ...req.action,
    id: `act_mock_${detail.actions.length + 1}_${id}`,
    applicationId: id,
    version: detail.application.version,
    actor: req.actor,
    timestamp,
  };

  const status =
    req.action.type === "approve" ? "approved" : req.action.type === "return" ? "returned" : req.action.finalDecision;

  const application: Application = { ...detail.application, status, decidedAt: timestamp };
  store().set(id, { ...detail, application, actions: [...detail.actions, action] });
  return { ok: true, value: { application, action } };
}
