"use client";

import useSWR from "swr";
import { useState, type FormEvent } from "react";
import { Button, FileDrop, Textarea, type FileChipData } from "@/components/ui";
import { api, ApiRequestError, POLL_MS } from "@/lib/api-client";
import { readApplicantId } from "@/lib/applicant";
import { guessKind } from "@/lib/documents";
import { uploadFiles } from "@/lib/upload";
import { ApplicantPermitView } from "./ApplicantPermitView";
import { ACCEPT } from "./PermitForm";

/** The applicant's view of one permit. Polls so "Approved" shows up within a few seconds. */
export function ApplicantStatus({ id, justFiled = false }: { id: string; justFiled?: boolean }) {
  const { data, error, mutate } = useSWR(["application", id], () => api.getApplication(id), {
    refreshInterval: POLL_MS,
  });

  if (error && !data) {
    const missing = error instanceof ApiRequestError && error.code === "not_found";
    return <p className="text-critical">{missing ? "We can't find that permit." : "Could not load this permit. Retrying."}</p>;
  }
  if (!data) return null;
  const app = data.application;

  return (
    <ApplicantPermitView detail={data} justFiled={justFiled} trackHref={`/track/${app.trackingCode}`}>
      {app.status === "returned" && (
        <ResubmitForm id={id} applicantId={app.applicantId} onDone={() => void mutate()} />
      )}
    </ApplicantPermitView>
  );
}

function ResubmitForm({ id, applicantId, onDone }: { id: string; applicantId: string; onDone: () => void }) {
  const [files, setFiles] = useState<FileChipData[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const picked = files.flatMap((f) => (f.file ? [f.file] : []));
    if (picked.length === 0) {
      setError("Attach the corrected documents.");
      return;
    }
    if (readApplicantId() !== applicantId) {
      setError("Only the electrician who filed this permit can resubmit it.");
      return;
    }
    setError(null);
    try {
      setProgress("Uploading");
      const refs = await uploadFiles(
        picked.map((file) => ({ file, kind: guessKind(file) })),
        applicantId,
        (done, total) => setProgress(done < total ? `Uploading ${done + 1} of ${total}` : "Resubmitting"),
      );
      await api.resubmitApplication(id, { applicantId, files: refs, note: note.trim() || null });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resubmit. Try again.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex max-w-2xl flex-col gap-6 border-t border-border pt-8">
      <h2 className="text-lg text-ink">Send corrected documents</h2>
      <FileDrop label="Corrected documents" accept={ACCEPT} onFilesChange={setFiles} error={error ?? undefined} />
      <Textarea label="What you changed" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      <div>
        <Button type="submit" loading={progress !== null}>
          {progress ?? "Resubmit"}
        </Button>
      </div>
    </form>
  );
}
