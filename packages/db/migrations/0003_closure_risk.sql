CREATE TABLE "contractor_stats" (
	"normalized_applicant" text PRIMARY KEY NOT NULL,
	"permit_count" integer NOT NULL,
	"prior_closure_rate" double precision NOT NULL,
	"as_of_date" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "closure_risk" jsonb;
