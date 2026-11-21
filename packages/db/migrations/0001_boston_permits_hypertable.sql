-- Hand-written (drizzle-kit generate --custom). Drizzle doesn't know hypertables.
-- boston_permits: Analyze Boston approved building permits, a TimescaleDB hypertable
-- on issued_date, compressed segments by worktype, newest first.
CREATE EXTENSION IF NOT EXISTS timescaledb;
--> statement-breakpoint
CREATE TABLE boston_permits (
  permitnumber text,
  worktype text,
  permittypedescr text,
  description text,
  comments text,
  applicant text,
  declared_valuation numeric,
  total_fees numeric,
  issued_date timestamptz NOT NULL,
  expiration_date timestamptz,
  status text,
  occupancytype text,
  sq_feet numeric,
  zip text,
  latitude double precision,
  longitude double precision,
  property_id text,
  PRIMARY KEY (permitnumber, issued_date)
) WITH (
  tsdb.hypertable,
  tsdb.segmentby = 'worktype',
  tsdb.orderby = 'issued_date DESC'
);
--> statement-breakpoint
CREATE INDEX boston_permits_worktype_issued_idx ON boston_permits (worktype, issued_date);
--> statement-breakpoint
CREATE INDEX boston_permits_status_idx ON boston_permits (status);
--> statement-breakpoint
-- Weekly permit counts by work type and zip. WITH NO DATA so it can run inside the
-- migration transaction; the refresh policy fills it.
CREATE MATERIALIZED VIEW permits_weekly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('7 days', issued_date) AS bucket,
  worktype,
  zip,
  count(*) AS permits
FROM boston_permits
GROUP BY bucket, worktype, zip
WITH NO DATA;
--> statement-breakpoint
SELECT add_continuous_aggregate_policy('permits_weekly',
  start_offset => NULL,
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 hour');
