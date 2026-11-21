import { type Address, type FileKind, type FileRef, type JobType } from "@permitpike/contract";
import type { FileChipData } from "@/components/ui";
import type { PermitFormInitial } from "@/components/apply/PermitForm";
import { DOCUMENTS } from "@/lib/documents";
import { streetLine } from "@/lib/format";

/*
 * Starting a real filing from the example library (web/public/examples/library.json,
 * built by `pnpm examples`). The library holds only what was filed: the request and its
 * documents. What PermitPike finds and what an official decides happen after filing.
 */

/** One library entry as library.json stores it. */
export interface LibraryEntry {
  slug: string;
  jobType: JobType;
  address: Address;
  estimatedProjectCost: number;
  jobDescription: string;
  files: FileRef[];
}

/** What someone starting a permit sees of an example: the request and its documents, nothing about how it went. */
export interface ExampleSummary {
  slug: string;
  /** "Heat pump at 64 Kittredge St". */
  request: string;
  jobType: JobType;
  neighborhood: string | null;
  /** Where the work is, for the map in "View details". */
  address: Address;
  documents: ExampleDocument[];
}

export interface ExampleDocument {
  kind: FileKind;
  /** What the document is, e.g. "Heat pump spec sheet". */
  title: string;
  /** Short enough that every tab fits on one row, e.g. "Spec sheet". */
  tab: string;
  name: string;
  /** The file itself, on this site. */
  href: string;
  /** An image to look at: the file, or the PNG rendered beside each PDF. */
  preview: string;
}

const JOB_NOUN: Record<JobType, string> = {
  heat_pump_panel: "Heat pump",
  ev_charger: "EV charger",
  home_battery: "Home battery",
};

const TAB: Partial<Record<FileKind, string>> = {
  spec_sheet: "Spec sheet",
  panel_photo: "Panel photo",
  site_plan: "Site plan",
  load_calc: "Load calculation",
};

/** "load-manager-spec.pdf" -> "Load manager spec": an "Other" file is named by what it is. */
function fromFileName(name: string): string {
  const words = name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Library URLs are absolute to the site that built them; serve them from this one. */
const local = (url: string) => url.replace(/^https?:\/\/[^/]+/, "");

export function exampleSummary(entry: LibraryEntry): ExampleSummary {
  const asks = DOCUMENTS[entry.jobType];
  return {
    slug: entry.slug,
    request: `${JOB_NOUN[entry.jobType]} at ${streetLine(entry.address)}`,
    jobType: entry.jobType,
    neighborhood: entry.address.neighborhood,
    address: entry.address,
    // In the order the filing form asks for them, so "Other" comes last.
    documents: [...entry.files]
      .sort((a, b) => asks.findIndex((x) => x.kind === a.kind) - asks.findIndex((x) => x.kind === b.kind))
      .map((f) => {
        const named = f.kind === "other" ? fromFileName(f.name) : null;
        return {
          kind: f.kind,
          title: named ?? asks.find((a) => a.kind === f.kind)?.title ?? f.name,
          tab: named ?? TAB[f.kind] ?? fromFileName(f.name),
          name: f.name,
          href: local(f.url),
          preview: f.contentType === "application/pdf" ? local(f.url).replace(/\.pdf$/, ".png") : local(f.url),
        };
      }),
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
  const chips: Partial<Record<FileKind, FileChipData[]>> = {};
  for (const f of entry.files) (chips[f.kind] ??= []).push({ name: f.name, sizeBytes: f.sizeBytes });
  return {
    jobType: entry.jobType,
    street: entry.address.street,
    unit: entry.address.unit ?? "",
    zip: entry.address.zip,
    neighborhood: entry.address.neighborhood,
    cost: entry.estimatedProjectCost.toLocaleString("en-US"),
    description: entry.jobDescription,
    files: files ?? chips,
  };
}

/** Fetches an example's documents as real files, so the live form can upload them like any other. */
export async function exampleFiles(entry: LibraryEntry): Promise<Partial<Record<FileKind, FileChipData[]>>> {
  const out: Partial<Record<FileKind, FileChipData[]>> = {};
  for (const f of entry.files) {
    const blob = await fetch(local(f.url)).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${f.name} from the example library.`);
      return r.blob();
    });
    const file = new File([blob], f.name, { type: f.contentType });
    (out[f.kind] ??= []).push({ name: f.name, sizeBytes: file.size, file });
  }
  return out;
}
