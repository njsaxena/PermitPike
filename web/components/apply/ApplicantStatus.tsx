"use client";

import useSWR from "swr";
import { useState, type FormEvent } from "react";
import { Button, Callout, FileDrop, Textarea, TrailTimeline, type FileChipData } from "@/components/ui";
import { Decision } from "@/components/permit/Decision";
import { PermitHeading } from "@/components/permit/PermitHeading";
import { api, ApiRequestError, POLL_MS } from "@/lib/api-client";
import { readApplicantId } from "@/lib/applicant";
import { trailSteps } from "@/lib/trail";
import { guessKind } from "@/lib/documents";
import { uploadFiles } from "@/lib/upload";
import { ACCEPT } from "./FilePermitForm";

/** The applicant's view of one permit. Polls so "Approved" shows up within a few seconds. */
export function ApplicantStatus({ id }: { id: string }) {
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
    <div className="flex flex-col gap-8">
      <PermitHeading app={app} />
      <TrailTimeline steps={trailSteps(data)} />

      {(app.status === "submitted" || app.status === "ai_review") && (
        <Callout title="PermitPike is checking your documents." />
      )}
      {app.status === "awaiting_official" && <Callout title="Waiting for a building official to review." />}

      <Decision detail={data} />

      {app.status === "returned" && (
        <ResubmitForm id={id} applicantId={app.applicantId} onDone={() => void mutate()} />
      )}
    </div>
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
