# Gemini document extraction tester

The tester reads one local PDF or image at a time. It accepts heat-pump specs,
panel labels, EV charger specs, and home battery specs. It uses the shared
contract's field names and keeps source quotes alongside each reading.

## Setup and scoring

Use the workspace's pnpm version. Set `GOOGLE_GENERATIVE_AI_API_KEY` in the
root `.env` after copying `.env.example`. The tester also accepts
`GEMINI_API_KEY` in that file. `GEMINI_MODEL` defaults to
`gemini-3.8-flash` and can be set in the root `.env` or shell.

From the repo root, install the dependencies and score the samples.

```sh
pnpm install
pnpm --filter @permitpike/agent score
```

The score command sends each PDF or image it needs to process to Gemini. It
compares the readings with [the labeled samples](samples/answers.json) and
prints per-field counts. Amps and volts must match exactly. Capacity in BTU/h
and power in W or kW may differ by up to 2%. Missing values count as correct
only when the answer is null. An unflagged error or a wrong critical answer on
a clean sample fails the run.

The ignored `.cache/` folder stores validated responses by file contents,
job type, model, prompt, and schema. Repeat runs with the same inputs reuse
the cached response. Pass `--refresh` to score against new model output.
The bundled fixtures are synthetic and their scope is documented in the
[sample notes](samples/README.md).

## Using the extractor

```ts
import { extract, extractWithEvidence } from "./extract";

const test = await extractWithEvidence("submittal.pdf", "heat_pump", {
  modelNumber: "ST-36",
});

const applicationExtraction = await extract("intake.pdf", "heat_pump_panel");
```

`extractWithEvidence` returns the field readings, paths below 0.7 confidence,
and a flag for sheets that need a target model number. Missing readings use
`null` and a source of `not found`. Numeric units are normalized in code to the
contract's units. For example, heat-pump tonnage becomes BTU/h and battery
continuous output is stored in watts.

`extract` returns the exact shared `Extraction` shape only when the document
provides enough data. When required fields are missing or the model cannot be
identified, it throws `IncompleteExtractionError` with the partial evidence in
`result`. Application callers should collect the missing information and ask
for confirmation of flagged readings before submitting them for review.

Inputs can be PDF, JPEG, PNG, WebP, HEIC, or HEIF, up to 14 MiB. Use only the
relevant pages of long catalogs and supply the exact model number for
multi-model sheets.
