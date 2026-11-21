"use client";

import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { JOB_DESCRIPTION_MAX, JOB_TYPE_LABELS, JobType, type Address, type FileKind } from "@permitpike/contract";
import { Button, DocumentSlot, Input, Select, Textarea, type FileChipData } from "@/components/ui";
import { DOCUMENTS } from "@/lib/documents";
import { neighborhoodForZip } from "@/lib/boston-zips";
import { PropertyConfirm, confirmedParcelId, type PropertyState } from "./PropertyConfirm";

/*
 * The filing form, without the saving: FilePermitForm uploads the documents and files it.
 * It can start filled in, e.g. from an example permit.
 */

const JOB_OPTIONS = JobType.options.map((value) => ({ value, label: JOB_TYPE_LABELS[value] }));
// Matches ALLOWED in app/api/blob/route.ts.
export const ACCEPT = ".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp";

type Errors = Partial<Record<"street" | "zip" | "property" | "cost" | "description" | "form", string>> & {
  docs?: Partial<Record<FileKind, string>>;
};

/** "$12,500", "12500" or "12,500.00" -> 12500. Null when it isn't a non-negative amount. */
export function parseUsd(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n <= 100_000_000 ? n : null;
}

/** "30000" -> "30,000", "1234567.5" -> "1,234,567.5": digits grouped by thousands as they're typed, two decimals at most. */
export function groupUsd(input: string): string {
  const cleaned = input.replace(/[^\d.]/g, "");
  const [whole = "", ...rest] = cleaned.split(".");
  const grouped = whole.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return cleaned.includes(".") ? `${grouped}.${rest.join("").slice(0, 2)}` : grouped;
}

/** Where the caret goes in `value` to sit after `digits` digits (commas don't count). */
function caretAfter(value: string, digits: number): number {
  let i = 0;
  for (let seen = 0; i < value.length && seen < digits; i++) if (/[\d.]/.test(value[i]!)) seen++;
  return i;
}

export interface PermitFormInitial {
  jobType?: JobType;
  street?: string;
  unit?: string;
  zip?: string;
  neighborhood?: string | null;
  cost?: string;
  description?: string;
  files?: Partial<Record<FileKind, FileChipData[]>>;
}

/** What the form hands over once everything checks out. */
export interface FiledPermit {
  jobType: JobType;
  address: Address;
  parcelId: string | null;
  estimatedProjectCost: number;
  jobDescription: string;
  files: { kind: FileKind; chip: FileChipData }[];
}

export function PermitForm({
  initial = {},
  heading = "File a permit",
  intro,
  lookupProperty = true,
  onFile,
}: {
  initial?: PermitFormInitial;
  heading?: string;
  /** Under the heading, e.g. which example this started from. */
  intro?: ReactNode;
  /** Look the address up on the parcel map (off in the static design demo). */
  lookupProperty?: boolean;
  /** Saves the permit. Report progress with `progress`; throw to show an error. */
  onFile: (permit: FiledPermit, progress: (label: string) => void) => Promise<void>;
}) {
  const [jobType, setJobType] = useState<JobType>(initial.jobType ?? "heat_pump_panel");
  const [street, setStreet] = useState(initial.street ?? "");
  const [unit, setUnit] = useState(initial.unit ?? "");
  // Not asked for: comes from the picked parcel, else from the ZIP.
  const [parcelNeighborhood, setParcelNeighborhood] = useState<string | null>(initial.neighborhood ?? null);
  const [zip, setZip] = useState(initial.zip ?? "");
  const [property, setProperty] = useState<PropertyState>({ kind: "idle" });
  const [cost, setCost] = useState(groupUsd(initial.cost ?? ""));
  // Commas move as the cost is typed; keep the caret after the same digit.
  const costCaret = useRef<{ el: HTMLInputElement; digits: number } | null>(null);
  useLayoutEffect(() => {
    const pending = costCaret.current;
    if (!pending) return;
    costCaret.current = null;
    const at = caretAfter(pending.el.value, pending.digits);
    pending.el.setSelectionRange(at, at);
  }, [cost]);
  const [description, setDescription] = useState(initial.description ?? "");
  // Kept by kind, so switching the job keeps what was already attached.
  const [files, setFiles] = useState<Partial<Record<FileKind, FileChipData[]>>>(initial.files ?? {});
  const [errors, setErrors] = useState<Errors>({});
  const [progress, setProgress] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const asks = DOCUMENTS[jobType];
    const docs: Partial<Record<FileKind, string>> = {};
    for (const ask of asks) {
      if (ask.required && !files[ask.kind]?.length) docs[ask.kind] = `Attach the ${ask.title.toLowerCase()}.`;
    }
    const next: Errors = {
      street: street.trim() ? undefined : "Enter the street address.",
      zip: /^\d{5}$/.test(zip.trim()) ? undefined : "Enter a 5-digit ZIP code.",
      // Only asked when the map found the parcel. A missing or slow map never holds up filing.
      property:
        property.kind === "found" && !property.confirmed
          ? "Confirm the property on the map, or choose “No, it isn't”."
          : undefined,
      cost: parseUsd(cost) === null ? "Enter the estimated cost in dollars, for example 12,500." : undefined,
      description:
        description.trim().length > JOB_DESCRIPTION_MAX
          ? `Keep the description to ${JOB_DESCRIPTION_MAX} characters.`
          : undefined,
      docs,
    };
    setErrors(next);
    if (next.street || next.zip || next.property || next.cost || next.description || Object.keys(docs).length > 0) return;

    try {
      setProgress("Filing");
      await onFile(
        {
          jobType,
          address: {
            street: street.trim(),
            unit: unit.trim() || null,
            neighborhood: parcelNeighborhood ?? neighborhoodForZip(zip),
            city: "Boston",
            state: "MA",
            zip: zip.trim(),
          },
          parcelId: confirmedParcelId(property),
          estimatedProjectCost: parseUsd(cost) ?? 0,
          jobDescription: description.trim(),
          files: asks.flatMap(({ kind }) => (files[kind] ?? []).map((chip) => ({ kind, chip }))),
        },
        setProgress,
      );
    } catch (err) {
      setProgress(null);
      setErrors({ form: err instanceof Error ? err.message : "Could not file the permit. Try again." });
    }
  }

  return (
    <form onSubmit={submit} onKeyDown={noEnterSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-title text-ink">{heading}</h1>
        {intro}
      </div>
      {/* Two columns on a laptop so the whole form fits on one screen: the job and
          property on the left, the documents and the submit button on the right. */}
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="flex min-w-0 flex-col gap-4">
          <Select label="Job" options={JOB_OPTIONS} value={jobType} onChange={(v) => setJobType(JobType.parse(v))} />
          <Input
            label="Street address"
            autoComplete="address-line1"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            error={errors.street}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Unit" autoComplete="address-line2" value={unit} onChange={(e) => setUnit(e.target.value)} />
            <Input
              label="ZIP code"
              mono
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              value={zip}
              onChange={(e) => {
                setZip(e.target.value);
                setParcelNeighborhood(null);
              }}
              error={errors.zip}
              required
            />
          </div>
          {lookupProperty && (
            <PropertyConfirm
              street={street}
              zip={zip}
              state={property}
              onState={(next) => {
                setProperty(next);
                if (next.kind !== "found" || next.confirmed) setErrors((prev) => ({ ...prev, property: undefined }));
              }}
              onPlace={(place) => {
                setZip(place.zip);
                setParcelNeighborhood(place.neighborhood);
              }}
              error={errors.property}
            />
          )}
          <Input
            label="Estimated project cost"
            unit="USD"
            mono
            inputMode="decimal"
            value={cost}
            onChange={(e) => {
              const el = e.target;
              let raw = el.value;
              let caret = el.selectionStart ?? raw.length;
              // Backspace on a comma: take the digit before it instead.
              if (groupUsd(raw) === cost && raw.length < cost.length && caret > 0) {
                raw = raw.slice(0, caret - 1) + raw.slice(caret);
                caret -= 1;
              }
              costCaret.current = { el, digits: raw.slice(0, caret).replace(/[^\d.]/g, "").length };
              setCost(groupUsd(raw));
            }}
            error={errors.cost}
            required
          />
          <div className="flex flex-col gap-1">
            <Textarea
              label="Job description"
              rows={3}
              maxLength={JOB_DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={errors.description}
            />
            <p className="self-end text-label text-muted" aria-live="polite">
              {description.length} of {JOB_DESCRIPTION_MAX}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <section aria-labelledby="documents" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="documents" className="text-lg text-ink">
                Documents
              </h2>
              <p className="text-sm text-muted">Accepted file types: PDF, JPG, PNG, HEIC and WebP, up to 25 MB each.</p>
            </div>
            <ul className="flex flex-col gap-2">
              {DOCUMENTS[jobType].map((ask) => (
                <li key={ask.kind}>
                  <DocumentSlot
                    title={ask.title}
                    hint={ask.hint}
                    required={ask.required}
                    accept={ACCEPT}
                    files={files[ask.kind] ?? []}
                    onFilesChange={(next) => {
                      setFiles((prev) => ({ ...prev, [ask.kind]: next }));
                      if (next.length > 0) {
                        setErrors((prev) => ({ ...prev, docs: { ...prev.docs, [ask.kind]: undefined } }));
                      }
                    }}
                    error={errors.docs?.[ask.kind]}
                    disabled={progress !== null}
                  />
                </li>
              ))}
            </ul>
          </section>
          {errors.form && <p className="text-sm text-critical">{errors.form}</p>}
          <div>
            <Button type="submit" loading={progress !== null}>
              {progress ?? "File permit"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

/**
 * Enter in a text field would file the permit (the browser's implicit submit). Filing
 * uploads documents and starts a review, so it only happens from the File button itself.
 * Enter still works in text areas, on buttons and links, and in pickers that use it.
 */
function noEnterSubmit(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key !== "Enter") return;
  const t = e.target as HTMLElement;
  if (t instanceof HTMLInputElement && !["button", "submit", "checkbox", "radio", "file"].includes(t.type)) {
    e.preventDefault();
  }
}
