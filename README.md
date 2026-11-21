<h1>
  <img src="docs/readme-banner.png" alt="PermitPike, built at BostonHacks 2026" width="100%">
</h1>

PermitPike is the fast lane for Boston electrical permits.

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
| `packages/compliance/` | Boston and Massachusetts source lookup tools and Mastra MCP |
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

## Boston compliance MCP

The Mastra reviewer and the local MCP server share these read-only tools.

| Tool | Input | Result |
| --- | --- | --- |
| `search_compliance_sources` | Optional `jobType` (`heat_pump_panel`, `ev_charger`, or `home_battery`) and `query` | Catalog matches with source IDs, citations, jurisdiction, and authority type |
| `get_compliance_source` | `sourceId` and optional `query` (an exact phrase or section number) | Live excerpts from the publisher's HTML or PDF, PDF page numbers, and retrieval status |
| `resolve_parcel_zoning` | Boston `street` and optional `zip`, or a 10-digit `parcelId` | Parcel, district and subdistrict matches, intersecting overlays, and available code and dimensional-table links |

Use this stdio configuration in an MCP client after installing the workspace
dependencies. Set the path to your local checkout and use Node 22.13+ for Mastra.

```json
{
  "mcpServers": {
    "permitpike-compliance": {
      "command": "pnpm",
      "args": [
        "--dir", "/absolute/path/to/PermitPike/packages/compliance",
        "--silent", "start"
      ]
    }
  }
}
```

For example, search with `{"jobType":"ev_charger","query":"EVSE"}`, then retrieve
`{"sourceId":"boston-evse-installation-guide","query":"electrical permit"}`.

For parcel zoning, try `{"street":"300 Washington Street","zip":"02121"}`.
Use the ZIP to narrow ambiguous matches or retry with a returned parcel ID.
The tool checks the parcel boundary against Boston’s published zoning layers.
For a parcel that spans multiple zones, use the location of the proposed work
and confirm the result against the city’s signed zoning maps.

Catalog search works offline. Excerpts require outbound HTTPS to the listed
publishers. For image-only PDFs, the tool returns the publisher link for manual
review. Each versioned entry links to the publishing authority so a reviewer
can check for newer amendments or the edition applicable to an older permit.
Massachusetts publishes its amendments to the NEC and NFPA 1 separately from
the adopted base standards. The catalog covers selected Boston and Massachusetts
sources. Confirm parcel-specific zoning and code applicability with the reviewing
authority. The MCP supplies references for review and has no permit decision actions.

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
