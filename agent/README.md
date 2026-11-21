# @permitpike/agent

Mastra server that reviews one permit application. `POST /review` takes an
`AgentReviewRequest` and returns an `AgentReviewResponse` (both in `packages/contract`).

## Pipeline (`src/mastra/workflows/review-application.ts`)

1. **extract**: uses `request.extraction` when it is for this job type and passes the
   pack's schema. Otherwise downloads the permit's public Vercel Blob uploads and
   reads them together with Gemini. Review requires evidence for every required
   field and confidence of at least 0.7 for each value extracted.
2. **run-checks** (`src/review/run-checks.ts`, pure): runs every rule in
   `getPack(jobType)`, then `calculateLoad` with `pack.addedLoads(fields)` and
   `pack.serviceRatingAmps(fields)`. A rule whose field is in `missingFields` is not run;
   it becomes a `warn` check saying manual review is needed (`RULE_REQUIRED_FIELDS`).
   If a load calc input is missing, the review stops with an error.
3. **recommend** (`src/review/recommend.ts`, pure): any fail -> `return_for_fixes`;
   any warn or a utility flag -> `approve_with_conditions`; else `approve`. Confidence is
   the mean of `extraction.fieldConfidence`. An Eversource `service_upgrade` flag comes
   from the pack or from a load calc that needs an upgrade. Then `permitReviewer` writes
   the summary (15 s timeout, `src/review/summary.ts`); on failure, or with no
   `GOOGLE_GENERATIVE_AI_API_KEY`, a plain summary is used. The model only writes the
   summary. The response is validated against `AgentReviewResponse` before it is returned.

If the workflow can't finish, `/review` returns `500 { error: { code: "internal", message } }`
and no recommendation. The web app then puts the application in the queue without one.

## Run locally with the web app

`.env` at the repo root (copy `.env.example`):

```
AGENT_URL=http://localhost:4111
AGENT_SHARED_SECRET=change-me-locally   # same value for web and agent
GOOGLE_GENERATIVE_AI_API_KEY=           # required for document extraction and model summaries
```

Two terminals from the repo root:

```bash
pnpm dev:agent
```

```bash
pnpm dev:web
```

File an application in the web app. The web calls `POST $AGENT_URL/review` after filing
and saves the result; the application shows up in the reviewer queue with it.

New filings send `extraction: null`. Include documents that identify the equipment
and state the service, installation, and existing load details. When required
information is missing, the application goes to the reviewer queue without a
recommendation. For a standalone review with pre-extracted fields, POST a request
carrying the extraction and the `x-permitpike-secret` header.

## Tests

```bash
pnpm --filter @permitpike/agent test
```

Fixture extractions in `test/fixtures` are fictional: clean pass, verified fail, missing field.
