"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { JOB_TYPE_LABELS, JobType, type FileKind } from "@permitpike/contract";
import { Button, DocumentSlot, Input, Select, type FileChipData } from "@/components/ui";
import { api } from "@/lib/api-client";
import { DOCUMENTS } from "@/lib/documents";
import { uploadFiles } from "@/lib/upload";
import { PropertyConfirm, confirmedParcelId, type PropertyState } from "./PropertyConfirm";

const JOB_OPTIONS = JobType.options.map((value) => ({ value, label: JOB_TYPE_LABELS[value] }));
export const ACCEPT = ".pdf,.jpg,.jpeg,.png,.heic";

type Errors = Partial<Record<"street" | "zip" | "property" | "form", string>> & { docs?: Partial<Record<FileKind, string>> };

export function FilePermitForm({ applicantId }: { applicantId: string }) {
  const router = useRouter();
  const [jobType, setJobType] = useState<JobType>("heat_pump_panel");
  const [street, setStreet] = useState("");
  const [unit, setUnit] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [zip, setZip] = useState("");
  const [property, setProperty] = useState<PropertyState>({ kind: "idle" });
  // Kept by kind, so switching the job keeps what was already attached.
  const [files, setFiles] = useState<Partial<Record<FileKind, FileChipData[]>>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [progress, setProgress] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const asks = DOCUMENTS[jobType];
    const picked = asks.flatMap(({ kind }) =>
      (files[kind] ?? []).flatMap((f) => (f.file ? [{ file: f.file, kind }] : [])),
    );
    const docs: Partial<Record<FileKind, string>> = {};
    for (const ask of asks) {
      if (ask.required && !(files[ask.kind]?.length)) docs[ask.kind] = `Attach the ${ask.title.toLowerCase()}.`;
    }
    const next: Errors = {
      street: street.trim() ? undefined : "Enter the street address.",
      zip: /^\d{5}$/.test(zip.trim()) ? undefined : "Enter a 5-digit ZIP code.",
      // Only asked when the map found the parcel. A missing or slow map never holds up filing.
      property:
        property.kind === "found" && !property.confirmed
          ? "Confirm the property on the map, or choose \u201cNo, it isn't\u201d."
          : undefined,
      docs,
    };
    setErrors(next);
    if (next.street || next.zip || next.property || Object.keys(docs).length > 0) return;

    try {
      setProgress("Uploading");
      const refs = await uploadFiles(picked, applicantId, (done, total) =>
        setProgress(done < total ? `Uploading ${done + 1} of ${total}` : "Filing"),
      );
      const { application } = await api.createApplication({
        applicantId,
        jobType,
        address: {
          street: street.trim(),
          unit: unit.trim() || null,
          neighborhood: neighborhood.trim() || null,
          city: "Boston",
          state: "MA",
          zip: zip.trim(),
        },
        parcelId: confirmedParcelId(property),
        files: refs,
      });
      router.push(`/apply/${application.id}`);
    } catch (err) {
      setProgress(null);
      setErrors({ form: err instanceof Error ? err.message : "Could not file the permit. Try again." });
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-title font-semibold text-ink">File a permit</h1>
      <Select
        label="Job"
        options={JOB_OPTIONS}
        value={jobType}
        onChange={(v) => setJobType(JobType.parse(v))}
      />
      <Input
        label="Street address"
        autoComplete="address-line1"
        value={street}
        onChange={(e) => setStreet(e.target.value)}
        error={errors.street}
        required
      />
      <div className="grid gap-6 sm:grid-cols-3">
        <Input label="Unit" autoComplete="address-line2" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <Input label="Neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
        <Input
          label="ZIP code"
          mono
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          error={errors.zip}
          required
        />
      </div>
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
          if (!neighborhood.trim() && place.neighborhood) setNeighborhood(place.neighborhood);
        }}
        error={errors.property}
      />
      <section aria-labelledby="documents" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="documents" className="text-lg font-semibold text-ink">
            Documents
          </h2>
          <p className="text-sm text-muted">
            PDFs or photos, one row per document. Phone photos are fine if the text is readable.
          </p>
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
    </form>
  );
}
