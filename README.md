# PermitPike

AI permit desk for residential electrical permits in Boston (heat pumps, panel
upgrades, EV chargers, home batteries). An electrician uploads specs; the agent
extracts fields, runs a shared load calc plus device-specific rule packs, and posts a
**recommendation** (approve / approve with conditions / return for fixes) with a
confidence score and a code citation on every check.

A licensed official always makes the final call. The AI never approves on its own.

BostonHacks 2026. Status: scaffold. API routes serve mocks.

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

Open http://localhost:3000/api/applications. With `USE_MOCKS=true` every route returns
mock data from `web/mocks/`.

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
| `pnpm evals`       | Validate and run eval cases                |

## API

All shapes live in `packages/contract/index.ts` (`API_ROUTES`).

- `POST /api/applications`
- `GET /api/applications?status=&jobType=`
- `GET /api/applications/:id`
- `POST /api/applications/:id/resubmit`
- `POST /api/applications/:id/review`
- `GET /api/evals`

## Deploy

- Web: Vercel project with root directory `web`. Set env vars from `.env.example`.
- Agent: `pnpm --filter @permitpike/agent build`, then run
  `node .mastra/output/index.mjs` on the Vultr box.

See `CONTRIBUTING.md` for the team workflow.
