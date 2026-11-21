# Example permit library

Five permit requests and their documents, for applicants to start a real filing from
(`/apply/new?example=<slug>`). The library holds only what is filed: the job, the
address, the cost, the description and the documents. What PermitPike finds and what an
official decides are not saved anywhere; they happen when the permit is filed. Every
person, company, product and document is fictional, and each document says so.

| # | Slug | Request |
| - | ---- | ------- |
| 1 | `ev-garage-clean` | EV charger at 112 Corey St, West Roxbury |
| 2 | `heat-pump-service-upgrade` | Heat pump and a new 200 A service at 64 Ashfield St, Roslindale |
| 3 | `heat-pump-setback-resubmit` | Heat pump at 48 Brookside Ave, Jamaica Plain |
| 4 | `ev-triple-decker-load-management` | EV charger with a load manager at 29 Westville St, Dorchester |
| 5 | `battery-solar-busbar` | Home battery with existing solar at 18 Metropolitan Ave, Hyde Park |

## Files

- `web/public/examples/library.json`: the requests (shape below).
- `web/public/examples/<slug>/`: the documents for each example (spec sheet, panel photo, site plan, plus extras),
  with a PNG of the first page of each PDF to look through on the filing screen.
  The web app serves them at `/examples/<slug>/<file>`.
- `examples/build.ts`: builds all of the above. `examples/documents.ts`: the document templates.

```ts
interface ExampleLibrary {
  note: string;
  examples: {
    slug: string;
    jobType: JobType;               // from @permitpike/contract
    address: Address;
    estimatedProjectCost: number;   // USD, as the electrician types it
    jobDescription: string;
    files: FileRef[];               // the documents of the first submission
  }[];
}
```

## Rebuilding

```bash
pnpm examples
```

Needs Google Chrome (set `CHROME_PATH` if it isn't in `/Applications`) and macOS `sips`.
`FileRef.url` must be absolute, so URLs use `EXAMPLES_ORIGIN` (default `http://localhost:3100`).

The library is plain JSON against the contract in `packages/`, so nothing imports it at build time.
