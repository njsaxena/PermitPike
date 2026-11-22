# Example permit library

Five permit requests and their documents, for applicants to start a real filing from
(`/apply/new?example=<slug>`). Each example holds what gets filed: the job, address, cost,
description and documents. PermitPike's review and the official's decision happen live when the
permit is filed. Every person, company, product and document is fictional, and each document
says so.

| # | Slug | Request |
| - | ---- | ------- |
| 1 | `ev-garage-clean` | EV charger at 112 Corey St, West Roxbury |
| 2 | `heat-pump-service-upgrade` | Heat pump and a new 200 A service at 64 Kittredge St, Roslindale |
| 3 | `heat-pump-setback-resubmit` | Heat pump at 48 Brookside Ave, Jamaica Plain |
| 4 | `ev-triple-decker-load-management` | EV charger with a load manager at 29 Wheatland Ave, Dorchester |
| 5 | `battery-solar-busbar` | Home battery with existing solar at 18 Williams Ave, Hyde Park |

## Files

- `web/public/examples/library.json`: the requests.
- `web/public/examples/<slug>/`: each example's documents (spec sheet, panel photo, site plan and
  extras), plus a PNG of each PDF's first page, served at `/examples/<slug>/<file>`.
- `examples/build.ts` builds them; `examples/documents.ts` holds the document templates.

## Rebuilding

```bash
pnpm examples
```

Needs Google Chrome (set `CHROME_PATH` if it lives outside `/Applications`) and macOS `sips`. File
URLs use `EXAMPLES_ORIGIN` (default `http://localhost:3100`).
