/**
 * Drizzle schema for Tiger Data (Postgres + TimescaleDB).
 *
 * JSON columns are typed with contract types; validate with the contract Zod
 * schemas when reading anything you did not just write.
 *
 * boston_permits becomes a TimescaleDB hypertable on issued_date in a raw SQL
 * migration (migrations/0001_boston_permits_hypertable.sql).
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

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });

export const jobTypeEnum = pgEnum("job_type", ["heat_pump_panel", "ev_charger", "home_battery"]);

export const applicationStatusEnum = pgEnum("application_status", [
  "submitted",
  "ai_review",
  "awaiting_official",
  "returned",
  "approved",
]);

export const reviewerActionTypeEnum = pgEnum("reviewer_action_type", ["approve", "return", "override"]);

/** Current state of each application. Per-submission data lives in application_versions. */
export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobType: jobTypeEnum("job_type").notNull(),
    address: jsonb("address").$type<Address>().notNull(),
    applicant: jsonb("applicant").$type<Applicant>().notNull(),
    status: applicationStatusEnum("status").notNull().default("submitted"),
    currentVersion: integer("current_version").notNull().default(1),
    submittedAt: timestamptz("submitted_at").notNull().defaultNow(),
    decidedAt: timestamptz("decided_at"),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [index("applications_status_idx").on(t.status)],
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
 * Hypertable on issued_date; TimescaleDB requires the partition column in the primary key.
 */
export const bostonPermits = pgTable(
  "boston_permits",
  {
    permitNumber: text("permit_number").notNull(),
    issuedDate: timestamptz("issued_date").notNull(),
    expirationDate: timestamptz("expiration_date"),
    workType: text("work_type"),
    permitTypeDescr: text("permit_type_descr"),
    description: text("description"),
    comments: text("comments"),
    status: text("status"),
    declaredValuation: numeric("declared_valuation"),
    totalFees: numeric("total_fees"),
    address: text("address"),
    zip: text("zip"),
    propertyId: text("property_id"),
    parcelId: text("parcel_id"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
  },
  (t) => [
    primaryKey({ columns: [t.permitNumber, t.issuedDate] }),
    index("boston_permits_work_type_idx").on(t.workType, t.issuedDate),
  ],
);
