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

Open http://localhost:3000/api/applications. With `USE_MOCKS=true` every route returns
mock data from `web/mocks/`.

```bash
pnpm dev:agent
```

Mastra dev server on http://localhost:4111.

## Boston compliance MCP

The Mastra reviewer and the local MCP server share two read-only tools.

| Tool | Input | Result |
| --- | --- | --- |
| `search_compliance_sources` | Optional `jobType` (`heat_pump_panel`, `ev_charger`, or `home_battery`) and `query` | Catalog matches with source IDs, citations, jurisdiction, and authority type |
| `get_compliance_source` | `sourceId` and optional `query` (an exact phrase or section number) | Live excerpts from the publisher's HTML or PDF, PDF page numbers, and retrieval status |

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
