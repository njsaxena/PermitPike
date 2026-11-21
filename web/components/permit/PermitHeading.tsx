import type { ReactNode } from "react";
import { Check, Clock, X } from "lucide-react";
import { JOB_TYPE_LABELS, type Application } from "@permitpike/contract";
import type { StatusChipStatus } from "@/components/ui/StatusChip";
import { cx } from "@/lib/cx";
import { displayStatus } from "@/lib/expiry";
import { clockTime, longDate, streetLine } from "@/lib/format";
import { JOB_ICON } from "./jobIcon";

/*
 * The head of one permit, set like the top of a city form: a square tile with the job's
 * icon, the address as the title, the job and neighborhood on the line under it, and the
 * status at the top right beside the control that changes it. Then the record strip: one
 * table row (column headers over an ink rule, values under) when the heading is at least
 * 768px wide, label beside value below that. No eyebrows.
 */

type Viewer = "official" | "applicant";

/** The status in words, for whoever is looking. Each has its own mark shape (never color alone). */
const STATUS: Record<StatusChipStatus, { label: (v: Viewer) => string; tone: string; mark: ReactNode }> = {
  draft: {
    label: () => "Draft",
    tone: "text-muted",
    mark: <span className="size-3.5 border border-dashed border-border-strong" />,
  },
  submitted: {
    label: () => "Submitted",
    tone: "text-ink",
    mark: <span className="size-3.5 border border-ink" />,
  },
  ai_review: {
    label: () => "PermitPike is checking",
    tone: "text-ink",
    mark: (
      <span className="flex size-3.5 border border-ink">
        <span className="h-full w-1/2 bg-ink" />
      </span>
    ),
  },
  awaiting_official: {
    label: (v) => (v === "official" ? "Waiting for your decision" : "Waiting for an official"),
    tone: "text-ink",
    mark: <span className="size-3.5 border border-ink bg-accent" />,
  },
  returned: {
    label: () => "Returned for fixes",
    tone: "text-critical",
    mark: <X className="size-4" strokeWidth={2.5} />,
  },
  approved: {
    label: () => "Approved",
    tone: "text-positive",
    mark: <Check className="size-4" strokeWidth={2.5} />,
  },
  expired: {
    label: () => "Expired",
    tone: "text-muted",
    mark: <Clock className="size-4" strokeWidth={2.5} />,
  },
};

function StatusLine({ status, viewer }: { status: StatusChipStatus; viewer: Viewer }) {
  const s = STATUS[status];
  return (
    <p className={cx("inline-flex items-center gap-2 text-base font-semibold whitespace-nowrap", s.tone)}>
      <span aria-hidden className="flex shrink-0 items-center">
        {s.mark}
      </span>
      {s.label(viewer)}
    </p>
  );
}

export interface PermitFact {
  label: string;
  value: ReactNode;
  /** A second, muted line: the time under a date, the company under a name. */
  detail?: ReactNode;
}

export function PermitHeading({
  app,
  viewer = "applicant",
  facts = [],
  actions,
}: {
  app: Application;
  /** The official sees who filed it and "Waiting for your decision"; the electrician sees neither. */
  viewer?: Viewer;
  /** More cells after the standard ones, e.g. the version on screen. */
  facts?: PermitFact[];
  /** Top right of the title row, e.g. "Change status". */
  actions?: ReactNode;
}) {
  const cells: PermitFact[] = [
    {
      label: "Permit",
      value: <span className="font-mono">{app.permitNumber}</span>,
    },
    {
      label: "Filed",
      value: longDate(app.submittedAt),
      detail: clockTime(app.submittedAt),
    },
  ];
  if (app.estimatedProjectCost !== null) {
    cells.push({
      label: "Cost",
      value: `$${app.estimatedProjectCost.toLocaleString("en-US")}`,
    });
  }
  cells.push(...facts);
  if (viewer === "official") {
    cells.push({
      label: "Applicant",
      value: app.applicant.name,
      detail: (
        <>
          {app.applicant.company ? `${app.applicant.company} · ` : ""}License{" "}
          <span className="font-mono whitespace-nowrap">
            {app.applicant.licenseNumber}
          </span>
        </>
      ),
    });
  }

  const JobIcon = JOB_ICON[app.jobType];

  return (
    <header className="@container flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <span
            aria-hidden
            className="flex size-14 shrink-0 items-center justify-center border border-ink bg-surface text-ink sm:size-19"
          >
            <JobIcon className="size-6.5 sm:size-8.5" strokeWidth={1.75} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-title text-balance text-ink sm:text-display sm:leading-[1.1] sm:tracking-[-0.015em]">
              {streetLine(app.address)}
            </h1>
            <p className="text-base text-muted sm:text-lg">
              <span className="font-semibold text-ink">{JOB_TYPE_LABELS[app.jobType]}</span>
              {" · "}
              {app.address.neighborhood ? `${app.address.neighborhood}, ` : ""}
              <span className="whitespace-nowrap">Boston MA {app.address.zip}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <StatusLine status={displayStatus(app)} viewer={viewer} />
          {actions}
        </div>
      </div>

      <dl className="flex flex-col border-t border-ink @3xl:flex-row @3xl:border-t-0 @3xl:border-b @3xl:border-border">
        {cells.map((c, i) => {
          // Padding sits inside the cells so the ink rule under the labels runs unbroken.
          const last = i === cells.length - 1;
          const gutter = last ? "" : "@3xl:pr-8";
          return (
            <div
              key={c.label}
              className={
                "grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 border-b border-border py-3 " +
                "@3xl:flex @3xl:flex-col @3xl:gap-0 @3xl:border-b-0 @3xl:py-0 " +
                (last ? "@3xl:min-w-0 @3xl:flex-1" : "@3xl:shrink-0")
              }
            >
              <dt
                className={`text-label font-semibold tracking-label text-muted uppercase @3xl:border-b @3xl:border-ink @3xl:pb-2 @3xl:whitespace-nowrap ${gutter}`}
              >
                {c.label}
              </dt>
              <dd className={`flex flex-col @3xl:pt-3 @3xl:pb-4 ${gutter}`}>
                <span className={`text-base font-semibold text-ink ${last ? "" : "@3xl:whitespace-nowrap"}`}>
                  {c.value}
                </span>
                {c.detail && (
                  <span className="text-sm text-muted">{c.detail}</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </header>
  );
}
