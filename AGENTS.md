# AGENTS.md

Rules for every AI coding agent working in this repo (Claude Code, Codex, Devin, Cursor, etc.).

## Attribution (always follow)

Never add Claude, Anthropic, or any AI tool as a co-author or contributor on anything.
No Co-Authored-By trailers, no 'Generated with Claude Code' lines, no AI attribution in
commit messages, PR descriptions, README, code comments, or docs.

## Project rules

- `packages/contract/index.ts` is the single source of truth for shapes shared between
  web, agent, packs and db. Do not redefine those types locally; import them.
- The AI only recommends. It never sets an application to `approved` or `returned`;
  only a `ReviewerAction` from a human official does that.
- Every `CheckResult` carries a code citation. No citation, no check.
- TypeScript strict. Keep it boring and readable.
- `pnpm check` from the repo root typechecks every package and builds web.
- No real secrets anywhere. Only `.env.example` is committed.
