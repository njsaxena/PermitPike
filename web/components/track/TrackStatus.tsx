"use client";

import useSWR from "swr";
import { JOB_TYPE_LABELS, JobType, type PublicTrackView, type TrackTimelineStep } from "@permitpike/contract";
import { ButtonLink, Callout } from "@/components/ui";
import { api, ApiRequestError, TRACK_POLL_MS } from "@/lib/api-client";
import { readApplicantId } from "@/lib/applicant";
import { clockTime, longDate } from "@/lib/format";
import { cx } from "@/lib/cx";
import { ProgramsCard } from "./ProgramsCard";
import { TrackLookup } from "./TrackLookup";

/** Public status for one tracking code. Polls every 10 seconds while the page is open. */
export function TrackStatus({ code }: { code: string }) {
  const { data, error } = useSWR(["track", code], () => api.getTrack(code), {
    // Stop polling on a miss; keep going while there is a permit to watch.
    refreshInterval: (latest) => (latest ? TRACK_POLL_MS : 0),
    shouldRetryOnError: (err: unknown) => !(err instanceof ApiRequestError && err.code === "not_found"),
  });

  if (error && !data) {
    const missing = error instanceof ApiRequestError && error.code === "not_found";
    const limited = error instanceof ApiRequestError && error.code === "rate_limited";
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-title text-ink">Track a permit</h1>
        <Callout
          tone="warning"
          title={missing ? "We couldn't find that code." : limited ? "Too many lookups. Wait a minute and try again." : "Could not load this status. Retrying."}
        />
        {missing && <TrackLookup />}
      </div>
    );
  }
  if (!data) return null;
  return <TrackView view={data} />;
}

export function TrackView({ view }: { view: PublicTrackView }) {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <div className="flex min-w-0 flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-title text-ink">{view.statusLabel}</h1>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
            <span className="font-mono text-ink">{view.code}</span>
            <span>{view.jobTypeLabel}</span>
            <span>{view.streetName}</span>
            <span>
              Filed {longDate(view.submittedAt)} at {clockTime(view.submittedAt)}
            </span>
          </p>
        </div>

        {view.aheadInQueue !== null && <p className="text-lg text-ink">{aheadLine(view.aheadInQueue)}</p>}

        {view.status === "changes_requested" && (
          <Callout title="The building official asked for changes.">
            {view.returnReason && <p>{view.returnReason}</p>}
            <OwnerResubmitLink code={view.code} />
          </Callout>
        )}

        <Timeline steps={view.timeline} />

        <section aria-labelledby="next-steps" className="flex flex-col gap-3">
          <h2 id="next-steps" className="text-lg text-ink">
            Next steps
          </h2>
          <ul className="flex max-w-prose list-disc flex-col gap-1 pl-5 text-ink">
            {view.nextSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      </div>

      <ProgramsCardForLabel label={view.jobTypeLabel} />
    </div>
  );
}

function aheadLine(n: number): string {
  if (n === 0) return "No applications are ahead of yours.";
  return n === 1 ? "1 application ahead of yours." : `${n} applications ahead of yours.`;
}

/** The public view carries the job's label, not its id; map it back for the programs list. */
function ProgramsCardForLabel({ label }: { label: string }) {
  const jobType = jobTypeFromLabel(label);
  return jobType ? <ProgramsCard jobType={jobType} /> : null;
}

function jobTypeFromLabel(label: string): JobType | null {
  return JobType.options.find((j) => JOB_TYPE_LABELS[j] === label) ?? null;
}

function Timeline({ steps }: { steps: TrackTimelineStep[] }) {
  const lastReached = steps.map((s) => s.at !== null).lastIndexOf(true);
  return (
    <section aria-labelledby="timeline" className="flex flex-col gap-3">
      <h2 id="timeline" className="text-lg text-ink">
        Timeline
      </h2>
      <ol className="flex flex-col border-l border-border-strong">
        {steps.map((s, i) => {
          const state = s.at === null ? "upcoming" : i === lastReached ? "current" : "done";
          return (
            <li key={`${s.kind}-${i}`} className="relative flex flex-col gap-0.5 pb-5 pl-6 last:pb-0">
              <span
                aria-hidden
                className={cx(
                  "absolute -left-[7px] top-1.5 size-3 border",
                  state === "done" && "border-ink bg-ink",
                  state === "current" && "border-ink bg-accent",
                  state === "upcoming" && "border-border-strong bg-surface",
                )}
              />
              <span className={cx("font-semibold", state === "upcoming" ? "text-muted" : "text-ink")}>
                {s.label}
                {state === "current" && <span className="sr-only"> (current step)</span>}
              </span>
              {s.at ? (
                <span className="text-sm text-muted">
                  {longDate(s.at)}, {clockTime(s.at)}
                </span>
              ) : (
                <span className="text-sm text-muted">Not yet</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * Only the electrician who filed it sees a resubmit link. The public view has no
 * applicant id, so the page asks "My permits" for a permit with this code.
 */
function OwnerResubmitLink({ code }: { code: string }) {
  const applicantId = typeof window === "undefined" ? null : readApplicantId();
  const { data } = useSWR(applicantId ? ["mine", applicantId] : null, () =>
    api.listApplications({ applicantId: applicantId! }),
  );
  const mine = data?.applications.find((a) => a.trackingCode === code);
  if (!mine) return null;
  return (
    <ButtonLink href={`/apply/${mine.id}`} variant="secondary" size="sm" className="mt-3">
      Resubmit corrected documents
    </ButtonLink>
  );
}
