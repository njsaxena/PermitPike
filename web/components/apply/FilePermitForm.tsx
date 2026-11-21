"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { uploadFiles } from "@/lib/upload";
import { PermitForm, type PermitFormInitial } from "./PermitForm";

export { ACCEPT, parseUsd } from "./PermitForm";

/** The real filing form: uploads the documents, files the permit, opens it. */
export function FilePermitForm({
  applicantId,
  initial,
  intro,
}: {
  applicantId: string;
  /** Filled in, e.g. from an example permit (with real files to upload). */
  initial?: PermitFormInitial;
  intro?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <PermitForm
      initial={initial}
      intro={intro}
      onFile={async (permit, progress) => {
        const picked = permit.files.flatMap(({ kind, chip }) => (chip.file ? [{ file: chip.file, kind }] : []));
        progress("Uploading");
        const refs = await uploadFiles(picked, applicantId, (done, total) =>
          progress(done < total ? `Uploading ${done + 1} of ${total}` : "Filing"),
        );
        const { application } = await api.createApplication({
          applicantId,
          jobType: permit.jobType,
          address: permit.address,
          parcelId: permit.parcelId,
          files: refs,
          estimatedProjectCost: permit.estimatedProjectCost,
          jobDescription: permit.jobDescription,
        });
        // ?filed shows the confirmation with the tracking code.
        router.push(`/apply/${application.id}?filed=1`);
      }}
    />
  );
}
