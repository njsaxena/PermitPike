/**
 * Drizzle schema for Tiger Data (Postgres + TimescaleDB).
 *
 * JSON columns are typed with contract types; validate with the contract Zod
 * schemas when reading anything you did not just write.
 *
 * boston_permits is created as a TimescaleDB hypertable by a raw SQL migration
 * (migrations/0001_boston_permits_hypertable.sql), together with the permits_weekly
 * continuous aggregate. Drizzle only knows its columns so it can query it.
 */
import {
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  Address,
  Applicant,
  EvalCaseResult,
  Extraction,
  FileRef,
  Recommendation,
} from "@permitpike/contract";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const jobTypeEnum = pgEnum("job_type", ["heat_pump_panel", "ev_charger", "home_battery"]);

export const applicationStatusEnum = pgEnum("application_status", [
  "submitted",
  "ai_review",
  "awaiting_official",
  "returned",
  "approved",
]);

export const reviewerActionTypeEnum = pgEnum("reviewer_action_type", ["approve", "return", "override"]);

/** Electricians. No password: the license number identifies them. */
export const applicants = pgTable("applicants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  company: text("company"),
  licenseNumber: text("license_number").notNull().unique(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

/** Current state of each application. Per-submission data lives in application_versions. */
export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Feeds the human permit number, e.g. EL-2026-00042. */
    permitSeq: serial("permit_seq").notNull().unique(),
    applicantId: uuid("applicant_id")
      .notNull()
      .references(() => applicants.id),
    jobType: jobTypeEnum("job_type").notNull(),
    address: jsonb("address").$type<Address>().notNull(),
    applicant: jsonb("applicant").$type<Applicant>().notNull(),
    /** Boston parcel id from the assessor, when known. */
    parcelId: text("parcel_id"),
    status: applicationStatusEnum("status").notNull().default("submitted"),
    /** Current version number; matches application_versions.version. */
    version: integer("version").notNull().default(1),
    /** Copies of the current version's agent output, so the queue reads one row. */
    extraction: jsonb("extraction").$type<Extraction>(),
    recommendation: jsonb("recommendation").$type<Recommendation>(),
    /** Queue risk derived from recommendation (web/lib/risk.ts). Null until reviewed. */
    risk: jsonb("risk").$type<{ level: "high" | "med" | "low" }>(),
    submittedAt: timestamptz("submitted_at").notNull().defaultNow(),
    decidedAt: timestamptz("decided_at"),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("applications_status_idx").on(t.status, t.submittedAt),
    index("applications_applicant_idx").on(t.applicantId, t.submittedAt),
  ],
);

/** One row per submission (v1 = original, v2+ = resubmits). Never updated after the agent writes recommendation. */
export const applicationVersions = pgTable(
  "application_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    files: jsonb("files").$type<FileRef[]>().notNull(),
    extraction: jsonb("extraction").$type<Extraction>(),
    recommendation: jsonb("recommendation").$type<Recommendation>(),
    note: text("note"),
    submittedAt: timestamptz("submitted_at").notNull().defaultNow(),
  },
  (t) => [unique("application_versions_app_version_uq").on(t.applicationId, t.version)],
);

/** Audit log. Append-only: insert, never update or delete. */
export const reviewerActions = pgTable(
  "reviewer_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    type: reviewerActionTypeEnum("type").notNull(),
    /** Required for return and override. */
    reason: text("reason"),
    note: text("note"),
    /** override only: "approved" | "returned". */
    finalDecision: text("final_decision"),
    conditions: jsonb("conditions").$type<string[]>().notNull().default([]),
    requestedFixes: jsonb("requested_fixes").$type<string[]>().notNull().default([]),
    overriddenRuleIds: jsonb("overridden_rule_ids").$type<string[]>().notNull().default([]),
    actorName: text("actor_name").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (t) => [index("reviewer_actions_app_idx").on(t.applicationId, t.createdAt)],
);

export const evalRuns = pgTable("eval_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  ranAt: timestamptz("ran_at").notNull().defaultNow(),
  gitSha: text("git_sha"),
  model: text("model").notNull(),
  totalCases: integer("total_cases").notNull(),
  passedCases: integer("passed_cases").notNull(),
  results: jsonb("results").$type<EvalCaseResult[]>().notNull(),
});

/**
 * Historical Boston permits (Analyze Boston "Approved Building Permits").
 * Column names follow the CSV. Hypertable on issued_date, segmented by worktype;
 * TimescaleDB requires the partition column in the primary key.
 */
export const bostonPermits = pgTable(
  "boston_permits",
  {
    permitNumber: text("permitnumber").notNull(),
    workType: text("worktype"),
    permitTypeDescr: text("permittypedescr"),
    description: text("description"),
    comments: text("comments"),
    applicant: text("applicant"),
    declaredValuation: numeric("declared_valuation"),
    totalFees: numeric("total_fees"),
    issuedDate: timestamptz("issued_date").notNull(),
    expirationDate: timestamptz("expiration_date"),
    status: text("status"),
    occupancyType: text("occupancytype"),
    sqFeet: numeric("sq_feet"),
    zip: text("zip"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    propertyId: text("property_id"),
  },
  (t) => [
    primaryKey({ columns: [t.permitNumber, t.issuedDate] }),
    index("boston_permits_worktype_issued_idx").on(t.workType, t.issuedDate),
    index("boston_permits_status_idx").on(t.status),
  ],
);
