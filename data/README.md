# Data

Seed and reference data. Large files stay out of git (`*.csv` is ignored).

## boston_permits

Source: Analyze Boston, "Approved Building Permits" (data.boston.gov). Download the
CSV and set `BOSTON_PERMITS_CSV_URL` in `.env`, or drop it here as
`data/boston_permits.csv`.

Loaded into the `boston_permits` hypertable (partitioned on `issued_date`). Useful for
"similar permits issued near this address" and approval-time stats on the reviewer
screen.

TODO: `load_boston_permits.ts` to map CSV columns to the table (permitnumber,
issued_date, worktype, permittypedescr, description, status, address, zip,
property_id, parcel_id, y_latitude, x_longitude) and bulk insert.
