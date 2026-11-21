import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ApplicationDetail, LoadCalcResult } from "@permitpike/contract";

/*
 * The example permit library (web/public/examples, built by `pnpm examples`) for the
 * portal demo on /design/portal. Server only: reads the JSON from disk.
 */

export interface PortalExample {
  slug: string;
  title: string;
  demonstrates: string;
  highlights: string[];
  detail: ApplicationDetail;
  existingServiceLoadCalc: LoadCalcResult | null;
  /** First-page images of the PDFs, by file id. */
  previews: Record<string, string>;
}

const PUBLIC = path.join(process.cwd(), "public");

/** "http://localhost:3100/examples/x/a.pdf" -> "/examples/x/a.pdf", so links work on any host. */
const local = (url: string) => url.replace(/^https?:\/\/[^/]+/, "");

/** A stable, valid-looking tracking code for an example (PP-XXXX-XXXX, no 0/O/1/I). */
function demoTrackingCode(slug: string): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let h = 2166136261;
  let out = "";
  for (let i = 0; i < 8; i++) {
    for (const ch of slug + i) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    out += abc[(h >>> 0) % abc.length];
  }
  return `PP-${out.slice(0, 4)}-${out.slice(4)}`;
}

export function loadPortalExamples(): PortalExample[] {
  const raw = JSON.parse(readFileSync(path.join(PUBLIC, "examples", "library.json"), "utf8")) as {
    examples: (Omit<PortalExample, "previews"> & { detail: ApplicationDetail })[];
  };
  return raw.examples.map((e) => {
    const fix = <T extends { files: { url: string }[] }>(x: T): T => ({
      ...x,
      files: x.files.map((f) => ({ ...f, url: local(f.url) })),
    });
    // Built before Application.parcel and trackingCode existed; the demo has no parcel lookup.
    const application = fix({
      ...e.detail.application,
      parcel: e.detail.application.parcel ?? null,
      trackingCode: e.detail.application.trackingCode ?? demoTrackingCode(e.slug),
    });
    const versions = e.detail.versions.map(fix);
    const previews: Record<string, string> = {};
    for (const f of [...application.files, ...versions.flatMap((v) => v.files)]) {
      if (f.contentType !== "application/pdf") continue;
      const png = f.url.replace(/\.pdf$/, ".png");
      if (existsSync(path.join(PUBLIC, png))) previews[f.id] = png;
    }
    return { ...e, detail: { ...e.detail, application, versions }, previews };
  });
}
