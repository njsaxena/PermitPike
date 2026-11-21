# Example permit library

Five demo applications with their documents and agent output. Together they cover every
job type, every recommendation, every load-calc result and both kinds of Eversource flag.
Every person, company, product and document is fictional, and each document says so.

| # | Slug | Job | Status | Recommendation | Load calc | What it shows |
| - | ---- | --- | ------ | -------------- | --------- | ------------- |
| 1 | `ev-garage-clean` | EV charger | approved | approve | fits, 53% of 200 A | The fast path: every check passes, approved in one click |
| 2 | `heat-pump-service-upgrade` | Heat pump + panel | awaiting official | approve with conditions | 107% of the old 100 A, 53% of the new 200 A | Why the upgrade is needed; Eversource service upgrade flag; Mass Save tip |
| 3 | `heat-pump-setback-resubmit` | Heat pump | approved (v2) | return, then approve | fits, 51% of 100 A | Fails the 5 ft setback, returned by an official, fixed, approved: the audit trail |
| 4 | `ev-triple-decker-load-management` | EV charger | approved with conditions | approve with conditions | tight, 97% of 100 A | A load manager instead of a service upgrade |
| 5 | `battery-solar-busbar` | Home battery | awaiting official | return for fixes | fits, 32% of 200 A | Busbar 120% rule fails; UL 9540 listing not found (low confidence, not guessed); interconnection flag |

## Files

- `web/public/examples/library.json`: the library (shape below). Each `detail` is a contract `ApplicationDetail`.
- `web/public/examples/<slug>/`: the documents for each example (spec sheet, panel photo, site plan, plus extras).
  The web app serves them at `/examples/<slug>/<file>`.
- `examples/build.ts`: builds all of the above. `examples/documents.ts`: the document templates.

```ts
interface ExampleLibrary {
  note: string;
  examples: {
    slug: string;
    title: string;
    demonstrates: string;               // one line for the library card
    highlights: string[];
    detail: ApplicationDetail;          // from @permitpike/contract
    existingServiceLoadCalc: LoadCalcResult | null; // #2 only: the calc on the old service
  }[];
}
```

## Rebuilding

```bash
pnpm examples
```

Needs Google Chrome (set `CHROME_PATH` if it isn't in `/Applications`) and macOS `sips`.
`FileRef.url` must be absolute, so URLs use `EXAMPLES_ORIGIN` (default `http://localhost:3100`).

The build fails if a change to the load calc or rule packs breaks what an example is meant
to show (for example, #4 no longer being tight).

## Where the numbers come from

- **Load calcs:** `calculateLoad` from `packages/loadcalc` (NEC 2026 120.83).
- **Heat pump checks:** `packs/heat_pump_panel`.
- **EV charger and battery checks:** written in `build.ts` until `packs/ev_charger.ts` and
  `packs/home_battery.ts` exist. Rule ids match `web/mocks`. Their citations carry the same
  `VERIFY` caveat as the packs (see `packs/README.md`).
- **Decision:** any failing check returns; any warning or utility flag adds conditions; otherwise approve.
- **Summaries and confidence scores:** written by hand to stand in for the model.

The library is built against the contract and load calc in `packages/` as of this commit's
working tree (NEC 2026 load calc shapes). It's plain JSON, so nothing imports it at build time.
