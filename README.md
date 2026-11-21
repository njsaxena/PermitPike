# PermitPike

AI permit desk for residential electrical permits in Boston (heat pumps, panel
upgrades, EV chargers, home batteries). An electrician uploads specs; the agent
extracts fields, runs a shared load calc plus device-specific rule packs, and posts a
**recommendation** (approve / approve with conditions / return for fixes) with a
confidence score and a code citation on every check.

A licensed official always makes the final call. The AI never approves on its own.

BostonHacks 2026. Applications live in Tiger Data; every device sees the same queue.

## Layout

| Path                 | What                                                         |
| -------------------- | ------------------------------------------------------------ |
| `web/`               | Next.js 15 app + API routes (Vercel)                          |
| `agent/`             | Mastra review agent + workflow (Vultr)                       |
| `packages/contract/` | Zod schemas + types shared by everything. Start here.        |
| `packages/loadcalc/` | Shared load calc: existing + added load vs service rating    |
| `packages/db/`       | Drizzle schema + migrations for Tiger Data                   |
| `packs/`             | Rule packs, one per job type                                 |
| `evals/`             | Labeled cases + runner                                       |
| `data/`              | Boston permits seed data (not committed)                     |

## Setup

Needs Node 20.12+ and pnpm (`corepack enable`).

```bash
pnpm install
```

```bash
cp .env.example .env
```

```bash
pnpm dev:web
```

Open http://localhost:3000. Needs `DATABASE_URL` in `.env`; uploads also need `BLOB_READ_WRITE_TOKEN`. First time against a new database:

```bash
pnpm db:migrate && pnpm seed
```

`pnpm seed` puts the three demo applications from `web/mocks/` into the database
(rerun it to reset the demo).

```bash
pnpm dev:agent
```

Mastra dev server on http://localhost:4111.

## Commands

| Command            | Does                                       |
| ------------------ | ------------------------------------------ |
| `pnpm check`       | Typecheck every package + build web. Run before every push. |
| `pnpm db:generate` | Generate a migration after editing `packages/db/schema.ts` |
| `pnpm db:migrate`  | Apply migrations to `DATABASE_URL`         |
| `pnpm db:check`    | Row counts per table + newest `permits_weekly` rows |
| `pnpm evals`       | Validate and run eval cases                |

## Database

Tiger Data (Postgres 18 + TimescaleDB). Everything reads `DATABASE_URL` from the root
`.env` (Tiger's connection string, `sslmode=require`). `.env` is gitignored; never commit it.

Run migrations (safe to rerun; only new ones apply):

```bash
pnpm db:migrate
```

Seed the three demo applications into the reviewer queue (rerun to reset the demo):

```bash
pnpm seed
```

Check what's in the database:

```bash
pnpm db:check
```

Tables: `applicants`, `applications`, `application_versions`, `reviewer_actions` (append-only
audit log) and `eval_runs` come from `packages/db/schema.ts` via `migrations/0000_init.sql`.
`boston_permits` is a hypertable on `issued_date` (segmented by `worktype`), and
`permits_weekly` is a continuous aggregate of weekly counts by `worktype` and `zip`, refreshed
hourly. Both are in the hand-written `migrations/0001_boston_permits_hypertable.sql`, because
Drizzle doesn't know hypertables. After editing `schema.ts`, run `pnpm db:generate`; never edit
a migration that has been applied, add a new one.

## API

All shapes live in `packages/contract/index.ts` (`API_ROUTES`).

- `POST /api/applicants` (name + license number; creates or reuses)
- `POST /api/reviewer/session` (reviewer name; sets the reviewer cookie, no passcode)
- `POST /api/blob` (upload tokens; browsers upload straight to Vercel Blob)
- `POST /api/applications`
- `GET /api/applications?status=&jobType=` (reviewer) or `?applicantId=` (My permits)
- `GET /api/applications/:id`
- `POST /api/applications/:id/resubmit`
- `POST /api/applications/:id/review`
- `GET /api/evals`

## Deploy

- Web: Vercel project with root directory `web`. Set env vars from `.env.example`.
- Agent: `pnpm --filter @permitpike/agent build`, then run
  `node .mastra/output/index.mjs` on the Vultr box.

See `CONTRIBUTING.md` for the team workflow.
