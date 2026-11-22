# @permitpike/agent

Mastra server that reviews one permit application. `POST /review` takes an `AgentReviewRequest`
and returns an `AgentReviewResponse` (both in `packages/contract`).

## Workflow (`src/mastra/workflows/review-application.ts`)

1. **extract**: reuses `request.extraction` when it matches the job type; otherwise downloads the
   permit's Vercel Blob uploads and reads them with Gemini. Every required field needs evidence
   and a confidence of at least 0.7.
2. **run-checks** (`src/review/run-checks.ts`, pure): runs every rule in `getPack(jobType)`, then
   `calculateLoad` with `pack.addedLoads(fields)` and `pack.serviceRatingAmps(fields)`. A rule
   whose field is in `missingFields` becomes a `warn` asking for manual review
   (`RULE_REQUIRED_FIELDS`). A missing load calc input skips the load calc: `loadCalc` is null
   and `shared.service_capacity` becomes a `warn` naming what the documents don't show.
3. **recommend** (`src/review/recommend.ts`, pure): any fail gives `return_for_fixes`; any warn
   or utility flag gives `approve_with_conditions`; otherwise `approve`. Confidence is the mean
   of `extraction.fieldConfidence`. An Eversource `service_upgrade` flag comes from the pack or
   from a load calc that needs an upgrade. `permitReviewer` then writes the summary (15 s
   timeout, `src/review/summary.ts`), with a plain fallback summary when the model is
   unavailable. The response is validated against `AgentReviewResponse`.

When the workflow fails, `/review` returns `500 { error: { code: "internal", message } }` and the
web app queues the application for a human review.

## Run locally

In the root `.env` (copied from `.env.example`):

```
AGENT_URL=http://localhost:4111
AGENT_SHARED_SECRET=change-me-locally   # same value for web and agent
GOOGLE_GENERATIVE_AI_API_KEY=           # for extraction and summaries
```

Then, in two terminals from the repo root:

```bash
pnpm dev:agent
```

```bash
pnpm dev:web
```

Filing an application calls `POST $AGENT_URL/review` and saves the result to the reviewer queue.
To review pre-extracted fields directly, POST a request with the extraction and the
`x-permitpike-secret` header.

## Tests

```bash
pnpm --filter @permitpike/agent test
```

`test/fixtures` holds fictional extractions: a clean pass, a verified fail and a missing field.
