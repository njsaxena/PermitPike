# @permitpike/db

Drizzle schema + migrations for Tiger Data.

```bash
pnpm db:generate   # after editing schema.ts; writes migrations/NNNN_*.sql
pnpm db:migrate    # applies migrations to DATABASE_URL (from the root .env)
```

`0001_boston_permits_hypertable.sql` is hand-written (created with
`drizzle-kit generate --custom`). It creates `boston_permits` as a hypertable on
`issued_date` (Tiger's `WITH (tsdb.hypertable, ...)` syntax), its indexes, and the
`permits_weekly` continuous aggregate with an hourly refresh policy. `0000_init.sql` has
the `boston_permits` statements removed by hand so 0001 owns that table. Don't edit applied migrations; add a new one.
