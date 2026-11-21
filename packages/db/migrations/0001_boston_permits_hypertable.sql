-- Hand-written: turn boston_permits into a TimescaleDB hypertable on issued_date.
-- Tiger Data ships TimescaleDB preinstalled; IF NOT EXISTS keeps this safe elsewhere.
CREATE EXTENSION IF NOT EXISTS timescaledb;
--> statement-breakpoint
SELECT create_hypertable(
  'boston_permits',
  by_range('issued_date', INTERVAL '1 month'),
  if_not_exists => TRUE
);
