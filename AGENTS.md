# AGENTS.md

Rules for every AI coding agent working in this repo (Claude Code, Codex, Devin, Cursor, etc.).

## Attribution (always follow)

Never add Claude, Anthropic, or any AI tool as a co-author or contributor on anything.
No Co-Authored-By trailers, no 'Generated with Claude Code' lines, no AI attribution in
commit messages, PR descriptions, README, code comments, or docs.

## Git workflow (always follow)

- Before starting any task: run `git fetch origin && git merge origin/main --no-edit`.
  If there's a merge conflict, stop and tell me before doing anything else.
- After finishing each task: run the build/tests, then commit with a short message
  and `git push` to my own branch. Never push directly to main.
- Every ~2 hours, or when I say "ship it": merge my branch into main and push main,
  only if the build passes.
- Never add Claude or any AI tool as a co-author. No Co-Authored-By trailers.

"Build/tests" means `pnpm check` from the repo root (typecheck every package + build web).

## Project rules

- `packages/contract/index.ts` is the single source of truth for shapes shared between
  web, agent, packs, db and evals. Do not redefine those types locally; import them.
  Contract changes are announced in team chat before they are pushed.
- The AI only recommends. It never sets an application to `approved` or `returned`;
  only a `ReviewerAction` from a human official does that.
- Every `CheckResult` carries a code citation. No citation, no check.
- TypeScript strict. Keep it boring and readable.
- No real secrets anywhere. Only `.env.example` is committed.
