/**
 * The demo permits' documents are the example filings bundled in web/public/examples.
 * Rows seeded before this mapping carry placeholder Blob URLs; viewerFile points those at
 * the bundled copies too, and gives each bundled PDF its rendered first page as a preview.
 */
import type { FileRef } from "@permitpike/contract";

const PLACEHOLDER = "https://mock.public.blob.vercel-storage.com/mocks/";

const DEMO_FILES: Record<string, string> = {
  "ex-24h-spec.pdf": "/examples/heat-pump-setback-resubmit/spec-sheet.pdf",
  "hp-panel.jpg": "/examples/heat-pump-setback-resubmit/panel-photo.jpg",
  "hp-site-plan-v1.pdf": "/examples/heat-pump-setback-resubmit/site-plan-rev-a.pdf",
  "hp-site-plan-v2.pdf": "/examples/heat-pump-setback-resubmit/site-plan-rev-b.pdf",
  "ev-charger-spec.pdf": "/examples/ev-garage-clean/spec-sheet.pdf",
  "ev-panel.jpg": "/examples/ev-garage-clean/panel-photo.jpg",
  "battery-spec.pdf": "/examples/battery-solar-busbar/spec-sheet.pdf",
  "battery-panel.jpg": "/examples/battery-solar-busbar/panel-photo.jpg",
  "battery-site-plan.pdf": "/examples/battery-solar-busbar/site-plan.pdf",
};

/** Bundled path for a demo document, by its file name. */
export function demoFileUrl(name: string): string {
  const url = DEMO_FILES[name];
  if (!url) throw new Error(`no bundled example for demo file ${name}`);
  return url;
}

/** A file ready for the viewer: bundled URL for demo documents, plus a PNG preview for bundled PDFs. */
export function viewerFile<F extends FileRef>(file: F, preview?: string): F & { preview?: string } {
  const name = file.url.startsWith(PLACEHOLDER) ? file.url.slice(PLACEHOLDER.length) : null;
  const url = (name && DEMO_FILES[name]) || file.url;
  const bundledPdf = url.startsWith("/examples/") && url.endsWith(".pdf");
  return { ...file, url, preview: preview ?? (bundledPdf ? url.replace(/\.pdf$/, ".png") : undefined) };
}
