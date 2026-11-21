"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import useSWR from "swr";
import { JobType } from "@permitpike/contract";
import { FilePermitForm } from "@/components/apply/FilePermitForm";
import { StartPermit } from "@/components/apply/StartPermit";
import { useApplicantId } from "@/lib/applicant";
import { exampleFiles, exampleInitial, exampleSummary, type LibraryEntry } from "@/lib/example-filing";

/** The example permit library, served from web/public/examples (built by `pnpm examples`). */
async function loadLibrary(): Promise<LibraryEntry[]> {
  const res = await fetch("/examples/library.json");
  if (!res.ok) return [];
  return ((await res.json()) as { examples: LibraryEntry[] }).examples;
}

/**
 * /apply/new             choose: your own job, or an example permit
 * /apply/new?job=…       the empty form for that kind of job
 * /apply/new?example=…   the form filled in from an example, its documents attached
 */
function NewPermit() {
  const router = useRouter();
  const params = useSearchParams();
  const { id, ready } = useApplicantId();
  const job = JobType.safeParse(params.get("job"));
  const slug = params.get("example");
  const { data: library } = useSWR("example-library", loadLibrary);
  const entry = slug ? library?.find((e) => e.slug === slug) : undefined;
  // The documents are fetched and attached as real files, so filing uploads them like any other.
  const { data: files, error: filesError } = useSWR(entry ? ["example-files", entry.slug] : null, () =>
    exampleFiles(entry!),
  );

  useEffect(() => {
    // Sign in first, then come back to this same form (the job or example picked).
    if (ready && !id) router.replace(`/apply?next=${encodeURIComponent(`/apply/new?${params.toString()}`)}`);
  }, [ready, id, router, params]);
  if (!ready || !id) return null;

  if (job.success) return <FilePermitForm applicantId={id} initial={{ jobType: job.data }} />;

  if (slug) {
    if (library && !entry) return <p className="text-critical">We can&apos;t find that example.</p>;
    if (filesError) return <p className="text-critical">{filesError.message}</p>;
    if (!entry || !files) return <p className="text-muted">Loading the example…</p>;
    return (
      <FilePermitForm
        applicantId={id}
        initial={exampleInitial(entry, files)}
        intro={
          <p className="text-sm text-muted">
            Filled in from the example <span className="font-semibold text-ink">{exampleSummary(entry).request}</span>,
            with its documents attached. Change anything before you file.
          </p>
        }
      />
    );
  }

  return (
    <StartPermit
      examples={(library ?? []).map(exampleSummary)}
      ownHref={(j) => `/apply/new?job=${j}`}
      exampleHref={(s) => `/apply/new?example=${s}`}
    />
  );
}

export default function NewPermitPage() {
  return (
    <Suspense>
      <NewPermit />
    </Suspense>
  );
}
