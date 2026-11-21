import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import type { ApplicationDetail, CheckStatus } from "@permitpike/contract";
import { ButtonLink, Callout, CheckRow, CheckSummary, TrailTimeline } from "@/components/ui";
import { Decision, latestAction } from "@/components/permit/Decision";
import { PermitHeading } from "@/components/permit/PermitHeading";
import { Step0DraftCard } from "@/components/permit/Step0Draft";
import { ServiceMeter } from "@/components/review/LoadCalcPanel";
import { ProgramsCard } from "@/components/track/ProgramsCard";
import { TrackingCodeCopy } from "@/components/track/TrackingCode";
import { applicantProposesUpgrade, buildStep0Draft, STEP0_TITLE } from "@/lib/step0";
import { trailSteps } from "@/lib/trail";

/*
 * One permit as the electrician who filed it sees it: where it is, what PermitPike found
 * (so they can fix things before an official gets to it), and the official's decision.
 * Used by /apply/[id] and the example permits on /design/applicant.
 */

const ORDER: Record<CheckStatus, number> = { fail: 0, warn: 1, pass: 2 };

export function ApplicantPermitView({
  detail,
  justFiled = false,
  note,
  trackHref,
  children,
  footer,
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
  /** The very end of the page, after the programs, e.g. deleting the permit. */
  footer?: ReactNode;
}) {
  const app = detail.application;
  const rec = detail.versions.find((v) => v.version === app.version)?.recommendation ?? null;
  const failing = rec?.checks.filter((c) => c.status === "fail").length ?? 0;
  // The electrician's own Step 0 draft: only when they entered a bigger service, built from
  // their inputs alone (no review, load calc or flag). Not twice if an official already sent one.
  const ownStep0 = applicantProposesUpgrade(app) && !officialSentStep0(detail) ? buildStep0Draft(app) : null;
  // The public status page sits beside the code it opens, as a real button.
  const statusPage = trackHref ? (
    <ButtonLink
      href={trackHref}
      variant="secondary"
      target="_blank"
      rel="noreferrer"
      icon={<ExternalLink aria-hidden className="size-4" strokeWidth={1.75} />}
      className="h-10 gap-1.5 px-3 text-sm"
    >
      Public status page
      <span className="sr-only"> (opens in a new tab)</span>
    </ButtonLink>
  ) : null;

  return (
    <div className="flex flex-col gap-8">
      {justFiled && (
        <Callout title="Permit filed. Keep this tracking code.">
          <p>Anyone with the code can check the status at the public tracking page, without signing in.</p>
          <TrackingCodeCopy code={app.trackingCode} action={statusPage} className="mt-3" />
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
          <TrackingCodeCopy code={app.trackingCode} action={statusPage} />
        </section>
      )}
      <TrailTimeline steps={trailSteps(detail)} />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-8">
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

          {footer}
        </div>

        {/* Second column: programs to look into while the permit waits. */}
        <aside aria-label="While you wait" className="flex flex-col gap-8 lg:sticky lg:top-8">
          {ownStep0 && <Step0DraftCard draft={ownStep0} compact />}
          <ProgramsCard jobType={app.jobType} />
        </aside>
      </div>
    </div>
  );
}

/** Whether the official's decision on this version carries a Step 0 draft. */
function officialSentStep0(detail: ApplicationDetail): boolean {
  const action = latestAction(detail);
  if (!action) return false;
  const texts =
    action.type === "approve" ? [action.note ?? ""] : action.type === "return" ? action.requestedFixes : [action.reason];
  return texts.some((t) => t.includes(STEP0_TITLE));
}
