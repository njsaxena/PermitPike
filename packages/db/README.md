# @permitpike/db

Drizzle schema and migrations for Tiger Data.

```bash
pnpm db:generate   # after editing schema.ts; writes migrations/NNNN_*.sql
pnpm db:migrate    # applies migrations to DATABASE_URL (from the root .env)
```

`0001_boston_permits_hypertable.sql` is hand-written (`drizzle-kit generate --custom`). It creates
`boston_permits` as a hypertable on `issued_date`, its indexes, and the `permits_weekly`
continuous aggregate with an hourly refresh. To change the schema, add a new migration.
