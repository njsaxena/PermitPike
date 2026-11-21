-- Public tracking codes, e.g. PP-7K3Q-9M2X. Alphabet has no 0, O, 1 or I.
-- Random bytes come from gen_random_uuid() (cryptographically random, built in since PG 13).
-- Bytes 6 and 8 of a v4 UUID carry version/variant bits, so only fully random bytes are used.
-- 256 is a multiple of 32, so byte % 32 is unbiased. The web generates codes itself;
-- this default covers backfill and any writer that does not send one.
CREATE OR REPLACE FUNCTION pp_tracking_code() RETURNS text
LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  picks constant int[] := ARRAY[0, 1, 2, 3, 4, 5, 10, 11];
  b bytea := uuid_send(gen_random_uuid());
  code text := 'PP-';
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    IF i = 5 THEN code := code || '-'; END IF;
    code := code || substr(alphabet, (get_byte(b, picks[i]) % 32) + 1, 1);
  END LOOP;
  RETURN code;
END
$$;--> statement-breakpoint
CREATE TABLE "track_rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "track_rate_limits_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "tracking_code" text DEFAULT pp_tracking_code() NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "estimated_project_cost" numeric;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "job_description" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "queued_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_tracking_code_unique" UNIQUE("tracking_code");