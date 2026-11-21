import { JOB_TYPE_LABELS, type Application } from "@permitpike/contract";
import { StatusChip } from "@/components/ui";
import { clockTime, longDate, streetLine } from "@/lib/format";

/** Address as the title; permit number, job and status beside and below it (no eyebrows). */
export function PermitHeading({ app }: { app: Application }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-title text-ink">{streetLine(app.address)}</h1>
        <StatusChip status={app.status} />
      </div>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
        <span className="font-mono text-ink">{app.permitNumber}</span>
        <span>{JOB_TYPE_LABELS[app.jobType]}</span>
        <span>{app.address.neighborhood ?? "Boston"} {app.address.zip}</span>
        <span>
          Filed {longDate(app.submittedAt)} at {clockTime(app.submittedAt)}
        </span>
      </p>
    </div>
  );
}
