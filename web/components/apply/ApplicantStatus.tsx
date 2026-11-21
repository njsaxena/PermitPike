"use client";

import useSWR, { useSWRConfig } from "swr";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { ApplicationDetail } from "@permitpike/contract";
import { Button, ConfirmDialog, FileDrop, Textarea, type FileChipData } from "@/components/ui";
import { clockTime, longDate } from "@/lib/format";
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
    <ApplicantPermitView
      detail={data}
      justFiled={justFiled}
      trackHref={`/track/${app.trackingCode}`}
      footer={<DeletePermit detail={data} />}
    >
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

/**
 * Last thing on the page, for the electrician who filed it. A permit can be deleted until a
 * building official acts on it; after that the audit log keeps it, and this says so instead.
 */
function DeletePermit({ detail }: { detail: ApplicationDetail }) {
  const app = detail.application;
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [owner, setOwner] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setOwner(readApplicantId() === app.applicantId), [app.applicantId]);
  if (!owner) return null;

  const onRecord = detail.actions.length > 0;

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api.deleteApplication(app.id, { applicantId: app.applicantId });
      await mutate(["my-permits", app.applicantId]);
      router.push("/apply");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the permit. Try again.");
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <section aria-labelledby="delete-permit" className="flex max-w-2xl flex-col gap-3 border-t border-border pt-8">
      <h2 id="delete-permit" className="text-lg text-ink">
        Delete this permit
      </h2>
      {onRecord ? (
        <p className="text-muted">
          A building official has acted on this permit, so it stays on the city&apos;s record and can&apos;t be
          deleted.
        </p>
      ) : (
        <>
          <p className="text-muted">
            Withdraws the application and removes its documents. The tracking code stops working. This can&apos;t
            be undone.
          </p>
          {error && <p className="text-sm text-critical">{error}</p>}
          <div>
            <Button variant="secondary" onClick={() => setOpen(true)}>
              Delete permit
            </Button>
          </div>
          <ConfirmDialog
            open={open}
            onClose={() => !busy && setOpen(false)}
            onConfirm={() => void remove()}
            title="Delete this permit?"
            confirmLabel={busy ? "Deleting" : "Delete permit"}
            confirmVariant="destructive"
          >
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted">Permit</dt>
              <dd className="font-mono">{app.permitNumber}</dd>
              <dt className="text-muted">Tracking code</dt>
              <dd className="font-mono">{app.trackingCode}</dd>
              <dt className="text-muted">Filed</dt>
              <dd>
                {longDate(app.submittedAt)} at {clockTime(app.submittedAt)}
              </dd>
            </dl>
            <p>The application, its documents and its tracking code are deleted. This can&apos;t be undone.</p>
          </ConfirmDialog>
        </>
      )}
    </section>
  );
}
