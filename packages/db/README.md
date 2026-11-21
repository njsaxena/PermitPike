# @permitpike/db

Drizzle schema + migrations for Tiger Data.

```bash
pnpm db:generate   # after editing schema.ts; writes migrations/NNNN_*.sql
pnpm db:migrate    # applies migrations to DATABASE_URL (from the root .env)
```

`0001_boston_permits_hypertable.sql` is hand-written (created with
`drizzle-kit generate --custom`). It enables TimescaleDB and turns `boston_permits`
into a hypertable on `issued_date`. Don't edit applied migrations; add a new one.
