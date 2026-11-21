import { JOB_TYPE_LABELS, type ApplicationDetail, type FileKind, type FileRef, type JobType } from "@permitpike/contract";
import type { FileChipData } from "@/components/ui";
import type { PermitFormInitial } from "@/components/apply/PermitForm";
import { streetLine } from "@/lib/format";

/*
 * Filing a permit from the example library (web/public/examples/library.json). The
 * library holds what was filed and what PermitPike found; filing one again starts from
 * the documents of its first submission. Cost and description aren't in the library,
 * so the values the electrician would have typed are kept here.
 */

/** One library entry as library.json stores it. */
export interface LibraryEntry {
  slug: string;
  title: string;
  demonstrates: string;
  highlights: string[];
  detail: ApplicationDetail;
}

const TYPED: Record<string, { cost: string; description: string }> = {
  "ev-garage-clean": {
    cost: "2,400",
    description: "Hardwired 48 A Level 2 EV charger in the attached garage on a new 60 A circuit.",
  },
  "heat-pump-service-upgrade": {
    cost: "28,500",
    description: "Cold-climate heat pump, with the service upgraded from 100 A to 200 A and a new 200 A panel.",
  },
  "heat-pump-setback-resubmit": {
    cost: "16,800",
    description: "Heat pump outdoor unit beside the house on a new 25 A circuit. No panel change.",
  },
  "ev-triple-decker-load-management": {
    cost: "6,900",
    description: "40 A EV charger on the outside wall of a triple-decker, with a load manager so the 100 A service isn't exceeded.",
  },
  "battery-solar-busbar": {
    cost: "14,200",
    description: "Home battery in the basement, tied to the existing solar through a 60 A backfeed breaker in the main panel.",
  },
};

/** What a card in the library shows. */
export interface ExampleSummary {
  slug: string;
  title: string;
  demonstrates: string;
  highlights: string[];
  jobType: JobType;
  jobLabel: string;
  address: string;
  neighborhood: string | null;
  files: FileRef[];
}

/** The files the example was first filed with. */
function firstFiles(entry: LibraryEntry): FileRef[] {
  return (entry.detail.versions[0] ?? entry.detail.versions.at(-1))?.files ?? entry.detail.application.files;
}

export function exampleSummary(entry: LibraryEntry): ExampleSummary {
  const app = entry.detail.application;
  return {
    slug: entry.slug,
    title: entry.title,
    demonstrates: entry.demonstrates,
    highlights: entry.highlights,
    jobType: app.jobType,
    jobLabel: JOB_TYPE_LABELS[app.jobType],
    address: streetLine(app.address),
    neighborhood: app.address.neighborhood,
    files: firstFiles(entry),
  };
}

/**
 * The filing form, filled in from an example. Pass `files` to attach real files (the live
 * form uploads them); without it the documents show as attached by name only (the demo).
 */
export function exampleInitial(
  entry: LibraryEntry,
  files: Partial<Record<FileKind, FileChipData[]>> | null = null,
): PermitFormInitial {
  const app = entry.detail.application;
  const typed = TYPED[entry.slug];
  const chips: Partial<Record<FileKind, FileChipData[]>> = {};
  for (const f of firstFiles(entry)) (chips[f.kind] ??= []).push({ name: f.name, sizeBytes: f.sizeBytes });
  return {
    jobType: app.jobType,
    street: app.address.street,
    unit: app.address.unit ?? "",
    zip: app.address.zip,
    neighborhood: app.address.neighborhood,
    cost: typed?.cost ?? "",
    description: typed?.description ?? "",
    files: files ?? chips,
  };
}

/** Fetches an example's documents as real files, so the live form can upload them like any other. */
export async function exampleFiles(entry: LibraryEntry): Promise<Partial<Record<FileKind, FileChipData[]>>> {
  const out: Partial<Record<FileKind, FileChipData[]>> = {};
  for (const f of firstFiles(entry)) {
    const path = f.url.replace(/^https?:\/\/[^/]+/, "");
    const blob = await fetch(path).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${f.name} from the example library.`);
      return r.blob();
    });
    const file = new File([blob], f.name, { type: f.contentType });
    (out[f.kind] ??= []).push({ name: f.name, sizeBytes: file.size, file });
  }
  return out;
}
