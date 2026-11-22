import "server-only";
import { and, asc, count, desc, eq, inArray, lt, type SQL } from "drizzle-orm";
import {
  applicants,
  applications,
  applicationVersions,
  getDb,
  reviewerActions,
} from "@permitpike/db";
import type {
  AgentReviewResponse,
  Application,
  ApplicantRecord,
  ApplicationDetail,
  ApplicationVersion,
  CreateApplicationRequest,
  ListApplicationsQuery,
  Parcel,
  PermitRiskScoreResponse,
  Recommendation,
  ResubmitApplicationRequest,
  ReviewerAction,
  UpdateApplicantRequest,
  ReviewerActionInput,
  ReviewerSession,
} from "@permitpike/contract";
import { approvalExpiresAt } from "@permitpike/contract";
import { RISK_ORDER, riskOf } from "@/lib/risk";
import { newTrackingCode } from "@/lib/tracking-code";

/*
 * Every read and write of applications goes through here, against Tiger Data.
 * No in-memory or browser state for applications.
 */

type AppRow = typeof applications.$inferSelect;

/** Value for applications.risk: the queue risk level, or null before a recommendation. */
function riskLevelRow(rec: Recommendation | null): AppRow["risk"] {
  const level = riskOf(rec);
  return level ? { level } : null;
}
type VersionRow = typeof applicationVersions.$inferSelect;
type ActionRow = typeof reviewerActions.$inferSelect;
type ApplicantRow = typeof applicants.$inferSelect;

export class RepoError extends Error {
  constructor(
    readonly code: "not_found" | "conflict" | "bad_request",
    message: string,
  ) {
    super(message);
  }
}

export const STALE_MESSAGE = "This permit was updated, reload.";

const iso = (d: Date) => d.toISOString();

export function permitNumber(seq: number, submittedAt: Date): string {
  return `EL-${submittedAt.getUTCFullYear()}-${String(seq).padStart(5, "0")}`;
}

function toApplicant(row: ApplicantRow): ApplicantRecord {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    licenseNumber: row.licenseNumber,
    createdAt: iso(row.createdAt),
  };
}

function toVersion(v: VersionRow): ApplicationVersion {
  return {
    applicationId: v.applicationId,
    version: v.version,
    files: v.files,
    extraction: v.extraction,
    recommendation: v.recommendation,
    note: v.note,
    submittedAt: iso(v.submittedAt),
  };
}

function toApplication(app: AppRow, v: VersionRow): Application {
  return {
    id: app.id,
    permitNumber: permitNumber(app.permitSeq, app.submittedAt),
    trackingCode: app.trackingCode,
    jobType: app.jobType,
    address: app.address,
    parcel: app.parcel,
    applicantId: app.applicantId,
    applicant: app.applicant,
    status: app.status,
    submittedAt: iso(app.submittedAt),
    decidedAt: app.decidedAt ? iso(app.decidedAt) : null,
    expiresAt: approvalExpiresAt(app.status, app.decidedAt ? iso(app.decidedAt) : null),
    files: v.files,
    extraction: v.extraction,
    recommendation: v.recommendation,
    closureRisk: app.closureRisk,
    estimatedProjectCost: app.estimatedProjectCost,
    jobDescription: app.jobDescription,
    version: app.version,
  };
}

function toAction(row: ActionRow): ReviewerAction {
  const meta = {
    id: row.id,
    applicationId: row.applicationId,
    version: row.version,
    actor: { name: row.actorName, role: "reviewer" as const },
    timestamp: iso(row.createdAt),
  };
  switch (row.type) {
    case "approve":
      return { ...meta, type: "approve", conditions: row.conditions, note: row.note };
    case "return":
      return { ...meta, type: "return", reason: row.reason ?? "", requestedFixes: row.requestedFixes };
    case "override":
      return {
        ...meta,
        type: "override",
        reason: row.reason ?? "",
        finalDecision: row.finalDecision === "approved" ? "approved" : "returned",
        overriddenRuleIds: row.overriddenRuleIds,
      };
  }
}

// ---------------------------------------------------------------------------
// Applicants
// ---------------------------------------------------------------------------

/** Creates the applicant, or returns the existing one with this license number (name updated). */
export async function upsertApplicant(name: string, licenseNumber: string): Promise<ApplicantRecord> {
  const [row] = await getDb()
    .insert(applicants)
    .values({ name, licenseNumber: licenseNumber.toUpperCase() })
    .onConflictDoUpdate({ target: applicants.licenseNumber, set: { name } })
    .returning();
  if (!row) throw new Error("applicant upsert returned no row");
  return toApplicant(row);
}

export async function getApplicant(id: string): Promise<ApplicantRecord | null> {
  if (!isUuid(id)) return null;
  const [row] = await getDb().select().from(applicants).where(eq(applicants.id, id));
  return row ? toApplicant(row) : null;
}

/** Name and company only. Filed permits keep their own snapshot of the applicant. */
export async function updateApplicant(id: string, req: UpdateApplicantRequest): Promise<ApplicantRecord> {
  if (!isUuid(id)) throw new RepoError("not_found", "No such applicant.");
  const [row] = await getDb()
    .update(applicants)
    .set({ name: req.name, company: req.company || null })
    .where(eq(applicants.id, id))
    .returning();
  if (!row) throw new RepoError("not_found", "No such applicant.");
  return toApplicant(row);
}

export async function applicantExists(id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const [row] = await getDb().select({ id: applicants.id }).from(applicants).where(eq(applicants.id, id));
  return Boolean(row);
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

/** Highest risk first when a recommendation exists, then newest first. */
export async function listApplications(query: ListApplicationsQuery): Promise<Application[]> {
  const where: SQL[] = [eq(applicationVersions.version, applications.version)];
  if (query.status) where.push(eq(applications.status, query.status));
  if (query.jobType) where.push(eq(applications.jobType, query.jobType));
  if (query.applicantId) {
    if (!isUuid(query.applicantId)) return [];
    where.push(eq(applications.applicantId, query.applicantId));
  }

  const rows = await getDb()
    .select({ app: applications, v: applicationVersions })
    .from(applications)
    .innerJoin(applicationVersions, eq(applicationVersions.applicationId, applications.id))
    .where(and(...where))
    .orderBy(desc(applications.submittedAt));

  const apps = rows.map((r) => toApplication(r.app, r.v));
  const rank = (a: Application) => {
    const r = riskOf(a.recommendation);
    return r ? RISK_ORDER[r] : 3;
  };
  // Array.sort is stable, so newest-first holds within each risk level.
  return apps.sort((a, b) => rank(a) - rank(b));
}

export async function getApplicationDetail(id: string): Promise<ApplicationDetail | null> {
  if (!isUuid(id)) return null;
  const db = getDb();
  const [app] = await db.select().from(applications).where(eq(applications.id, id));
  if (!app) return null;
  const versions = await db
    .select()
    .from(applicationVersions)
    .where(eq(applicationVersions.applicationId, id))
    .orderBy(asc(applicationVersions.version));
  const current = versions.find((v) => v.version === app.version);
  if (!current) throw new Error(`application ${id} has no row for version ${app.version}`);
  const actions = await db
    .select()
    .from(reviewerActions)
    .where(eq(reviewerActions.applicationId, id))
    .orderBy(asc(reviewerActions.createdAt));
  return {
    application: toApplication(app, current),
    versions: versions.map(toVersion),
    actions: actions.map(toAction),
  };
}

/** Postgres unique_violation on the tracking code: one in a trillion, so just draw again. */
function isTrackingCodeClash(err: unknown): boolean {
  const e = err as { code?: string; constraint_name?: string; cause?: { code?: string; constraint_name?: string } };
  const pg = e?.code ? e : e?.cause;
  return pg?.code === "23505" && pg.constraint_name === "applications_tracking_code_unique";
}

/** Inserts the application as "submitted", version 1. The caller then triggers review. */
export async function createApplication(req: CreateApplicationRequest): Promise<Application> {
  if (!isUuid(req.applicantId)) throw new RepoError("bad_request", "Unknown applicant.");
  for (let attempt = 1; ; attempt++) {
    try {
      return await insertApplication(req, newTrackingCode());
    } catch (err) {
      if (attempt < 3 && isTrackingCodeClash(err)) continue;
      throw err;
    }
  }
}

async function insertApplication(req: CreateApplicationRequest, trackingCode: string): Promise<Application> {
  return getDb().transaction(async (tx) => {
    const [applicant] = await tx.select().from(applicants).where(eq(applicants.id, req.applicantId));
    if (!applicant) throw new RepoError("bad_request", "Unknown applicant.");

    const [app] = await tx
      .insert(applications)
      .values({
        applicantId: applicant.id,
        trackingCode,
        jobType: req.jobType,
        address: req.address,
        estimatedProjectCost: req.estimatedProjectCost,
        jobDescription: req.jobDescription.trim() || null,
        applicant: { name: applicant.name, company: applicant.company, licenseNumber: applicant.licenseNumber },
        status: "submitted",
        version: 1,
      })
      .returning();
    if (!app) throw new Error("application insert returned no row");

    const [v] = await tx
      .insert(applicationVersions)
      .values({ applicationId: app.id, version: 1, files: req.files })
      .returning();
    if (!v) throw new Error("version insert returned no row");
    return toApplication(app, v);
  });
}

/** Saves the parcel found for an application after filing. */
export async function saveParcel(id: string, parcel: Parcel): Promise<void> {
  await getDb()
    .update(applications)
    .set({ parcel, parcelId: parcel.parcelId })
    .where(eq(applications.id, id));
}

/** Adds a new version and puts the application back to "submitted". Only from "returned". */
/**
 * Deletes an application the applicant filed, before any official has acted on it.
 * Versions go with it (cascade). Returns every file URL it held so the caller can
 * remove the uploads. Once a reviewer action exists the audit log keeps the permit.
 */
export async function deleteApplication(id: string, applicantId: string): Promise<string[]> {
  if (!isUuid(id)) throw new RepoError("not_found", "No such application.");
  return getDb().transaction(async (tx) => {
    const [app] = await tx.select().from(applications).where(eq(applications.id, id)).for("update");
    if (!app || app.applicantId !== applicantId) throw new RepoError("not_found", "No such application.");
    const [acted] = await tx
      .select({ n: count() })
      .from(reviewerActions)
      .where(eq(reviewerActions.applicationId, id));
    if ((acted?.n ?? 0) > 0) {
      throw new RepoError("conflict", "A building official has acted on this permit, so it stays on record.");
    }
    const versions = await tx
      .select({ files: applicationVersions.files })
      .from(applicationVersions)
      .where(eq(applicationVersions.applicationId, id));
    await tx.delete(applications).where(eq(applications.id, id));
    return [...new Set(versions.flatMap((v) => v.files.map((f) => f.url)))];
  });
}

export async function resubmitApplication(id: string, req: ResubmitApplicationRequest): Promise<Application> {
  if (!isUuid(id)) throw new RepoError("not_found", "No such application.");
  return getDb().transaction(async (tx) => {
    const [app] = await tx.select().from(applications).where(eq(applications.id, id)).for("update");
    if (!app) throw new RepoError("not_found", "No such application.");
    if (app.applicantId !== req.applicantId) throw new RepoError("not_found", "No such application.");
    if (app.status !== "returned") throw new RepoError("conflict", STALE_MESSAGE);

    const version = app.version + 1;
    const [v] = await tx
      .insert(applicationVersions)
      .values({ applicationId: id, version, files: req.files, note: req.note })
      .returning();
    const [updated] = await tx
      .update(applications)
      .set({
        version,
        status: "submitted",
        decidedAt: null,
        extraction: null,
        recommendation: null,
        closureRisk: null,
        risk: null,
        queuedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, id))
      .returning();
    if (!v || !updated) throw new Error("resubmit wrote no rows");
    return toApplication(updated, v);
  });
}

/**
 * Records an official's action in the audit log and moves the status.
 * Rejects with "conflict" when the version or status changed since the reviewer loaded it.
 */
export async function reviewApplication(
  id: string,
  expectedVersion: number,
  action: ReviewerActionInput,
  reviewer: ReviewerSession,
): Promise<{ application: Application; action: ReviewerAction }> {
  if (!isUuid(id)) throw new RepoError("not_found", "No such application.");
  return getDb().transaction(async (tx) => {
    const [app] = await tx.select().from(applications).where(eq(applications.id, id)).for("update");
    if (!app) throw new RepoError("not_found", "No such application.");
    if (app.version !== expectedVersion || app.status !== "awaiting_official") {
      throw new RepoError("conflict", STALE_MESSAGE);
    }

    const [row] = await tx
      .insert(reviewerActions)
      .values({
        applicationId: id,
        version: app.version,
        type: action.type,
        actorName: reviewer.name,
        reason: action.type === "approve" ? null : action.reason,
        note: action.type === "approve" ? action.note : null,
        finalDecision: action.type === "override" ? action.finalDecision : null,
        conditions: action.type === "approve" ? action.conditions : [],
        requestedFixes: action.type === "return" ? action.requestedFixes : [],
        overriddenRuleIds: action.type === "override" ? action.overriddenRuleIds : [],
      })
      .returning();
    if (!row) throw new Error("reviewer action insert returned no row");

    const status =
      action.type === "approve" ? "approved" : action.type === "return" ? "returned" : action.finalDecision;
    const [updated] = await tx
      .update(applications)
      .set({ status, decidedAt: row.createdAt, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    const [v] = await tx
      .select()
      .from(applicationVersions)
      .where(and(eq(applicationVersions.applicationId, id), eq(applicationVersions.version, app.version)));
    if (!updated || !v) throw new Error("review update wrote no rows");
    return { application: toApplication(updated, v), action: toAction(row) };
  });
}

// ---------------------------------------------------------------------------
// Review pipeline writes (used by lib/server/review.ts)
// ---------------------------------------------------------------------------

/** submitted -> ai_review, only if this version is still current. Returns false if it moved on. */
export async function markInReview(id: string, version: number): Promise<boolean> {
  const rows = await getDb()
    .update(applications)
    .set({ status: "ai_review", queuedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(applications.id, id), eq(applications.version, version), eq(applications.status, "submitted")))
    .returning({ id: applications.id });
  return rows.length > 0;
}

/** Writes the agent's output and moves ai_review -> awaiting_official ("recommended"). */
export async function saveRecommendation(
  id: string,
  version: number,
  result: { extraction: AgentReviewResponse["extraction"] | null; recommendation: Recommendation | null },
): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx
      .update(applicationVersions)
      .set({ extraction: result.extraction, recommendation: result.recommendation })
      .where(and(eq(applicationVersions.applicationId, id), eq(applicationVersions.version, version)));
    await tx
      .update(applications)
      .set({
        status: "awaiting_official",
        extraction: result.extraction,
        recommendation: result.recommendation,
        risk: riskLevelRow(result.recommendation),
        updatedAt: new Date(),
      })
      .where(and(eq(applications.id, id), eq(applications.version, version), eq(applications.status, "ai_review")));
  });
}

/** Stores closure risk independently from the existing recommendation-derived queue risk. */
export async function saveClosureRisk(
  id: string,
  version: number,
  closureRisk: PermitRiskScoreResponse | null,
): Promise<void> {
  await getDb()
    .update(applications)
    .set({ closureRisk, updatedAt: new Date() })
    .where(and(eq(applications.id, id), eq(applications.version, version)));
}

export async function getVersionForReview(
  id: string,
  version: number,
): Promise<{ app: AppRow; v: VersionRow } | null> {
  const [row] = await getDb()
    .select({ app: applications, v: applicationVersions })
    .from(applications)
    .innerJoin(applicationVersions, eq(applicationVersions.applicationId, applications.id))
    .where(
      and(
        eq(applications.id, id),
        eq(applications.version, version),
        eq(applicationVersions.version, version),
      ),
    );
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Public tracking (web/lib/track.ts turns these into the public view)
// ---------------------------------------------------------------------------

/** Statuses that are still waiting on someone at the city. */
const OPEN_STATUSES = ["submitted", "ai_review", "awaiting_official"] as const;

/** The application behind a tracking code, plus when its current version joined the queue. */
export async function getTrackRecord(
  code: string,
): Promise<{ detail: ApplicationDetail; queuedAt: string | null } | null> {
  const [row] = await getDb()
    .select({ id: applications.id, queuedAt: applications.queuedAt })
    .from(applications)
    .where(eq(applications.trackingCode, code));
  if (!row) return null;
  const detail = await getApplicationDetail(row.id);
  return detail ? { detail, queuedAt: row.queuedAt ? iso(row.queuedAt) : null } : null;
}

/** Open applications filed before this one: everyone ahead of it in line. */
export async function countAheadInQueue(app: Pick<Application, "id" | "submittedAt">): Promise<number> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(applications)
    .where(and(inArray(applications.status, [...OPEN_STATUSES]), lt(applications.submittedAt, new Date(app.submittedAt))));
  return row?.n ?? 0;
}
