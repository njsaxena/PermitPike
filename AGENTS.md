# AGENTS.md

Rules for every AI coding agent working in this repo.

## Project rules

- `packages/contract/index.ts` is the single source of truth for shapes shared between
  web, agent, packs and db. Do not redefine those types locally; import them.
- The AI only recommends. It never sets an application to `approved` or `returned`;
  only a `ReviewerAction` from a human official does that.
- Every `CheckResult` carries a code citation. No citation, no check.
- TypeScript strict. Keep it boring and readable.
- `pnpm check` from the repo root typechecks every package and builds web.
- No real secrets anywhere. Only `.env.example` is committed.
