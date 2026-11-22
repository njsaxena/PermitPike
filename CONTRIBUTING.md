# Contributing

## The contract

- `packages/contract/index.ts` defines every shape that crosses a boundary
  (web <-> agent <-> db <-> packs).
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
