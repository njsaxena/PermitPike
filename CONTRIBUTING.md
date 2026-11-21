# Contributing

Three people, one deadline (Sun 9am). Keep main green.

## Branches

- One branch per person, named after you (`allegra`, `nik`, ...). Work there.
- Before you start anything: `git fetch origin && git merge origin/main --no-edit`.
  Conflict? Stop and sort it out before writing more code.
- Merge your branch into `main` every 2 hours, and only when `pnpm check` passes.
- Never push broken code to `main`. Never force-push `main`.

## The contract

- `packages/contract/index.ts` defines every shape that crosses a boundary
  (web <-> agent <-> db <-> packs <-> evals).
- Changing it? Post the change in team chat first, wait for a thumbs-up, then push it
  to main on its own small commit so everyone can merge it right away.
- Never copy contract types into your own package. Import them.

## Before you push

```bash
pnpm check
```

That typechecks every package and builds the web app.

## No AI attribution

This applies to everyone, including anyone using Claude Code, Codex, Devin, Cursor or
any other AI tool:

Never add Claude, Anthropic, or any AI tool as a co-author or contributor on anything.
No Co-Authored-By trailers, no 'Generated with Claude Code' lines, no AI attribution in
commit messages, PR descriptions, README, code comments, or docs.

Agent-specific rules live in `AGENTS.md`.
