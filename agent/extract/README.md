# Gemini document extraction

Reads one PDF or image at a time (heat-pump specs, panel labels, EV charger specs, home battery
specs) into the shared contract's fields, with a source quote for each reading.

## Setup and scoring

Set `GOOGLE_GENERATIVE_AI_API_KEY` (or `GEMINI_API_KEY`) in the root `.env`. `GEMINI_MODEL`
defaults to `gemini-3.8-flash`.

```sh
pnpm --filter @permitpike/agent score
```

Scoring compares readings with [the labeled samples](samples/answers.json) and prints per-field
counts. Amps and volts must match exactly; BTU/h and W or kW may differ by up to 2%. A missing
value counts as correct when the answer is null. An unflagged error, or a wrong critical answer on
a clean sample, fails the run.

Responses are cached in `.cache/` by file contents, job type, model, prompt and schema. Pass
`--refresh` to score fresh model output. See [the sample notes](samples/README.md) for what the
fixtures cover.

## Using the extractor

```ts
import { extract, extractWithEvidence } from "./extract";

const test = await extractWithEvidence("submittal.pdf", "heat_pump", { modelNumber: "ST-36" });
const applicationExtraction = await extract("intake.pdf", "heat_pump_panel");
```

`extractWithEvidence` returns the readings, the paths below 0.7 confidence, and a flag for sheets
that need a model number. Absent readings are `null` with the source `not found`. Units are
normalized to the contract's: tons become BTU/h, battery output is stored in watts.

`extract` returns the shared `Extraction` shape when the document covers every required field.
Otherwise it throws `IncompleteExtractionError` with the partial evidence in `result`, so the
caller can ask for the missing values.

Inputs: PDF, JPEG, PNG, WebP, HEIC or HEIF, up to 14 MiB. For multi-model sheets, pass the exact
model number.
