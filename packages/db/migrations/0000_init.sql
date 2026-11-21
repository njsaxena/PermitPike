CREATE TYPE "public"."application_status" AS ENUM('submitted', 'ai_review', 'awaiting_official', 'returned', 'approved');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('heat_pump_panel', 'ev_charger', 'home_battery');--> statement-breakpoint
CREATE TYPE "public"."reviewer_action_type" AS ENUM('approve', 'return', 'override');--> statement-breakpoint
CREATE TABLE "application_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"files" jsonb NOT NULL,
	"extraction" jsonb,
	"recommendation" jsonb,
	"note" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_versions_app_version_uq" UNIQUE("application_id","version")
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_type" "job_type" NOT NULL,
	"address" jsonb NOT NULL,
	"applicant" jsonb NOT NULL,
	"status" "application_status" DEFAULT 'submitted' NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boston_permits" (
	"permit_number" text NOT NULL,
	"issued_date" timestamp with time zone NOT NULL,
	"expiration_date" timestamp with time zone,
	"work_type" text,
	"permit_type_descr" text,
	"description" text,
	"comments" text,
	"status" text,
	"declared_valuation" numeric,
	"total_fees" numeric,
	"address" text,
	"zip" text,
	"property_id" text,
	"parcel_id" text,
	"latitude" double precision,
	"longitude" double precision,
	CONSTRAINT "boston_permits_permit_number_issued_date_pk" PRIMARY KEY("permit_number","issued_date")
);
--> statement-breakpoint
CREATE TABLE "eval_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"git_sha" text,
	"model" text NOT NULL,
	"total_cases" integer NOT NULL,
	"passed_cases" integer NOT NULL,
	"results" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviewer_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"type" "reviewer_action_type" NOT NULL,
	"reason" text,
	"note" text,
	"final_decision" text,
	"conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requested_fixes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"overridden_rule_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actor_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_versions" ADD CONSTRAINT "application_versions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_actions" ADD CONSTRAINT "reviewer_actions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_status_idx" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "boston_permits_work_type_idx" ON "boston_permits" USING btree ("work_type","issued_date");--> statement-breakpoint
CREATE INDEX "reviewer_actions_app_idx" ON "reviewer_actions" USING btree ("application_id","created_at");