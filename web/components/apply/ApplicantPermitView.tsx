import Link from "next/link";
import type { ReactNode } from "react";
import type { ApplicationDetail, CheckStatus } from "@permitpike/contract";
import { Callout, CheckRow, CheckSummary, TrailTimeline } from "@/components/ui";
import { Decision } from "@/components/permit/Decision";
import { PermitHeading } from "@/components/permit/PermitHeading";
import { ServiceMeter } from "@/components/review/LoadCalcPanel";
import { ProgramsCard } from "@/components/track/ProgramsCard";
import { TrackingCodeCopy } from "@/components/track/TrackingCode";
import { trailSteps } from "@/lib/trail";

/*
 * One permit as the electrician who filed it sees it: where it is, what PermitPike found
 * (so they can fix things before an official gets to it), and the official's decision.
 * Used by /apply/[id] (live) and the applicant demo on /design/applicant.
 */

const ORDER: Record<CheckStatus, number> = { fail: 0, warn: 1, pass: 2 };

export function ApplicantPermitView({
  detail,
  justFiled = false,
  note,
  trackHref,
  children,
}: {
  detail: ApplicationDetail;
  /** Straight after filing: lead with the tracking code. */
  justFiled?: boolean;
  /** One line under the heading, e.g. that this is an example. */
  note?: ReactNode;
  /** The public status page, when there is one to link to. */
  trackHref?: string | null;
  /** Below the decision, e.g. the resubmit form. */
  children?: ReactNode;
}) {
  const app = detail.application;
  const rec = detail.versions.find((v) => v.version === app.version)?.recommendation ?? null;
  const failing = rec?.checks.filter((c) => c.status === "fail").length ?? 0;

  return (
    <div className="flex flex-col gap-8">
      {justFiled && (
        <Callout title="Permit filed. Keep this tracking code.">
          <p>Anyone with the code can check the status at the public tracking page, without signing in.</p>
          <TrackingCodeCopy code={app.trackingCode} className="mt-3" />
        </Callout>
      )}
      <div className="flex flex-col gap-2">
        <PermitHeading app={app} />
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>
      {!justFiled && (
        <section aria-labelledby="tracking-code" className="flex flex-col gap-2">
          <h2 id="tracking-code" className="text-lg text-ink">
            Tracking code
          </h2>
          <TrackingCodeCopy code={app.trackingCode} />
        </section>
      )}
      {trackHref && (
        <Link href={trackHref} className="pp-link self-start text-sm">
          Open the public status page
        </Link>
      )}
      <TrailTimeline steps={trailSteps(detail)} />

      {(app.status === "submitted" || app.status === "ai_review") && (
        <Callout title="PermitPike is checking your documents." />
      )}
      {app.status === "awaiting_official" && (
        <Callout
          title={
            failing > 0
              ? `Waiting for a building official. PermitPike found ${failing} ${failing === 1 ? "problem" : "problems"} they will look at.`
              : "Waiting for a building official to review."
          }
        />
      )}

      <Decision detail={detail} />
      {children}

      {rec && (
        <section aria-labelledby="found" className="flex max-w-3xl flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="found" className="text-lg text-ink">
              What PermitPike found
            </h2>
            <p className="text-sm text-muted">
              PermitPike checks the documents against the electrical and zoning code. A building official makes the
              decision.
            </p>
          </div>
          <CheckSummary checks={rec.checks} size="sm" />
          {rec.utilityFlag && (
            <Callout tone="utility" title={`${rec.utilityFlag.utility}: ${rec.utilityFlag.reason}`}>
              {rec.utilityFlag.action}
            </Callout>
          )}
          <ul className="border-t border-ink">
            {[...rec.checks]
              .sort((a, b) => ORDER[a.status] - ORDER[b.status])
              .map((c) => (
                <CheckRow key={c.ruleId} {...c} />
              ))}
          </ul>
          <div className="border border-border bg-surface p-card">
            <ServiceMeter calc={rec.loadCalc} label="Load on the service" />
          </div>
        </section>
      )}

      <ProgramsCard jobType={app.jobType} />
    </div>
  );
}
