import { APPROVAL_VALID_DAYS, type ApplicationDetail, type ReviewerAction } from "@permitpike/contract";
import { isExpired } from "@/lib/expiry";
import { Callout, SignatureBlock } from "@/components/ui";
import { longDate, stamp } from "@/lib/format";

/** The official's latest action on the current version, if any. */
export function latestAction(detail: ApplicationDetail): ReviewerAction | undefined {
  return detail.actions.filter((a) => a.version === detail.application.version).at(-1);
}

/** What the official decided: a signature when approved, the reasons when returned. */
export function Decision({ detail }: { detail: ApplicationDetail }) {
  const { application: app } = detail;
  const action = latestAction(detail);
  if (!action) return null;

  if (app.status === "approved") {
    const conditions = action.type === "approve" ? action.conditions : [];
    return (
      <section aria-labelledby="decision" className="flex flex-col gap-4">
        <h2 id="decision" className="text-lg text-ink">
          Approved
        </h2>
        {action.type === "override" && <p className="text-ink">{action.reason}</p>}
        {conditions.length > 0 && (
          <Callout tone="warning" title="Conditions of approval">
            <ul className="list-disc pl-5">
              {conditions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Callout>
        )}
        <SignatureBlock name={action.actor.name} signedAt={stamp(action.timestamp)} permitNumber={app.permitNumber} />
        {app.expiresAt &&
          (isExpired(app) ? (
            <Callout title={`This approval expired on ${longDate(app.expiresAt)}.`}>
              Approvals are valid for {APPROVAL_VALID_DAYS} days. File a new permit to do this work.
            </Callout>
          ) : (
            <p className="text-sm text-muted">
              Valid until {longDate(app.expiresAt)}. Approvals are valid for {APPROVAL_VALID_DAYS} days.
            </p>
          ))}
      </section>
    );
  }

  if (app.status === "returned") {
    const fixes = action.type === "return" ? action.requestedFixes : [];
    const reason = action.type === "approve" ? null : action.reason;
    return (
      <Callout tone="warning" title={`Returned for fixes by ${action.actor.name}`}>
        <div className="flex flex-col gap-2">
          {reason && <p>{reason}</p>}
          {fixes.length > 0 && (
            <ul className="list-disc pl-5">
              {fixes.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      </Callout>
    );
  }
  return null;
}
