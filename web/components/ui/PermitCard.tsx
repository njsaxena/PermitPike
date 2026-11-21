import Link from "next/link";
import { Check, X } from "lucide-react";
import { JOB_TYPE_LABELS, type ApplicationStatus, type CheckStatus, type JobType } from "@permitpike/contract";
import { cx } from "@/lib/cx";
import { longDate } from "@/lib/format";
import { CheckSummary } from "./CheckRow";
import { RiskBadge, type RiskLevel } from "./RiskBadge";
import { StatusChip } from "./StatusChip";
import { TRAIL_STOPS, type TrailStepState } from "./TrailTimeline";

/** What a permit panel or queue row needs. Built from an application by the caller. */
export interface PermitSummary {
  id: string;
  permitNumber: string;
  street: string;
  neighborhood: string;
  jobType: JobType;
  status: ApplicationStatus;
  /** Null until PermitPike has posted a recommendation. */
  risk: RiskLevel | null;
  /** "2026-11-21 09:14" or ISO; shown in words. Also the sort key within a group. */
  filed: string;
  checks: Partial<Record<CheckStatus, number>>;
}

/** Where each status sits on the trail: one state per stop, Filed → Signed. */
export const TRAIL_PROGRESS: Record<ApplicationStatus, { stops: TrailStepState[]; at: number }> = {
  submitted: { stops: ["current", "upcoming", "upcoming", "upcoming", "upcoming"], at: 0 },
  ai_review: { stops: ["done", "current", "upcoming", "upcoming", "upcoming"], at: 1 },
  awaiting_official: { stops: ["done", "done", "done", "current", "upcoming"], at: 3 },
  returned: { stops: ["done", "done", "done", "returned", "upcoming"], at: 3 },
  approved: { stops: ["done", "done", "done", "done", "done"], at: 4 },
};

/** Progress groups, in trail order. The queue lists permits by these. */
export const PROGRESS_GROUPS: { id: string; title: string; statuses: ApplicationStatus[] }[] = [
  { id: "checking", title: "In progress", statuses: ["submitted", "ai_review"] },
  { id: "awaiting", title: "Waiting", statuses: ["awaiting_official"] },
  { id: "returned", title: "Returned", statuses: ["returned"] },
  { id: "approved", title: "Approved", statuses: ["approved"] },
];

/** Five small trail markers with the current stop named. Same marks as TrailTimeline. */
export function MiniTrail({ status, className }: { status: ApplicationStatus; className?: string }) {
  const p = TRAIL_PROGRESS[status];
  const stop = TRAIL_STOPS[p.at]!;
  const label =
    status === "approved" ? "Signed" : status === "returned" ? `${stop.label}: returned` : stop.label;
  return (
    <span className={cx("flex flex-wrap items-center gap-x-2.5 gap-y-1", className)}>
      <span aria-hidden className="flex shrink-0 items-center">
        {p.stops.map((state, i) => (
          <span key={i} className="flex items-center">
            {i > 0 && (
              <span
                className={cx(
                  "h-0.5 w-2",
                  state === "upcoming" ? "bg-border" : "bg-critical",
                )}
              />
            )}
            <span
              className={cx(
                "flex size-3.5 items-center justify-center",
                state === "done" && "bg-ink text-surface",
                state === "current" && "border-2 border-ink bg-accent",
                state === "returned" && "bg-critical text-surface",
                state === "upcoming" && "border border-border-strong bg-surface",
              )}
            >
              {state === "done" && <Check className="size-2.5" strokeWidth={3.5} />}
              {state === "returned" && <X className="size-2.5" strokeWidth={3.5} />}
            </span>
          </span>
        ))}
      </span>
      <span className="text-sm font-semibold text-ink">
        {label}
        <span className="font-normal text-muted">
          {" "}
          · {p.at + 1} of {TRAIL_STOPS.length}
        </span>
      </span>
    </span>
  );
}

/** True once any check has a result. Before that, show no counts rather than zeros. */
export function hasChecks(permit: Pick<PermitSummary, "checks">) {
  return Object.values(permit.checks).some((n) => (n ?? 0) > 0);
}

/** One permit as a panel: where and what, its status, what the checks found. */
export function PermitCard({
  permit,
  href,
  className,
}: {
  permit: PermitSummary;
  /** Makes the whole panel a link, e.g. to the review page. */
  href?: string;
  className?: string;
}) {
  // Three reads, top to bottom: where it stands and which job, what the checks and risk say,
  // then the reference line. The group heading and the chip already say how far along it is.
  const body = (
    <>
      <div className="flex flex-col items-start gap-3">
        <StatusChip status={permit.status} />
        <div className="flex flex-col gap-0.5">
          <span className="text-lg leading-snug font-semibold text-ink">{permit.street}</span>
          <span className="text-sm text-muted">
            {permit.neighborhood} · {JOB_TYPE_LABELS[permit.jobType]}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-start gap-2">
        {hasChecks(permit) ? (
          <CheckSummary counts={permit.checks} variant="inline" />
        ) : (
          <span className="text-sm text-muted">Checks not run yet</span>
        )}
        {permit.risk && <RiskBadge level={permit.risk} plain />}
      </div>
      <span className="mt-auto flex flex-col gap-0.5 pt-1 text-sm text-muted">
        <span>
          Filed <time dateTime={permit.filed.replace(" ", "T")}>{longDate(permit.filed)}</time>
        </span>
        <span className="font-mono text-label">{permit.permitNumber}</span>
      </span>
    </>
  );
  const classes = cx(
    "flex h-full flex-col gap-4 border border-border bg-surface p-5 text-left",
    href && "transition-colors duration-100 ease-out hov:border-ink",
    className,
  );
  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <article className={classes}>{body}</article>
  );
}
