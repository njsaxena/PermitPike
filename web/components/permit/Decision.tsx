import type { ApplicationDetail, ReviewerAction } from "@permitpike/contract";
import { Callout, SignatureBlock } from "@/components/ui";
import { stamp } from "@/lib/format";
import { isStep0Text, parseStep0Text, splitStep0 } from "@/lib/step0";
import { Step0DraftCard } from "./Step0Draft";

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
    // An override's reason is shown; an approval note stays with the city, apart from a Step 0 draft attached to it.
    const reason = action.type === "override" ? splitStep0(action.reason) : null;
    const draft = action.type === "approve" ? (action.note ? splitStep0(action.note).draft : null) : (reason?.draft ?? null);
    return (
      <section aria-labelledby="decision" className="flex flex-col gap-4">
        <h2 id="decision" className="text-lg text-ink">
          Approved
        </h2>
        {reason?.message && <p className="text-ink">{reason.message}</p>}
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
        {draft && <Step0DraftCard draft={parseStep0Text(draft)} id="step0-sent" />}
      </section>
    );
  }

  if (app.status === "returned") {
    const all = action.type === "return" ? action.requestedFixes : [];
    const fixes = all.filter((f) => !isStep0Text(f));
    const draft = all.find(isStep0Text) ?? null;
    const reason = action.type === "approve" ? null : action.reason;
    return (
      <div className="flex flex-col gap-4">
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
        {draft && <Step0DraftCard draft={parseStep0Text(draft)} id="step0-sent" />}
      </div>
    );
  }
  return null;
}
