"use client";

import { useState } from "react";
import type { ReviewerActionInput } from "@permitpike/contract";
import { Button, Callout, SignatureBlock } from "@/components/ui";
import { ChangeStatus } from "@/components/review/ChangeStatus";
import { ReviewWorkspace } from "@/components/review/ReviewWorkspace";
import { DEMO_OFFICIAL } from "../demo-official";
import type { PortalExample } from "../library";

/*
 * One example permit in the full review workspace. Decisions stay in this page: nothing
 * is saved. Both outcomes are always in the markup (hidden until chosen) so the static
 * copy on the design artifact can show them without React.
 */
export function PortalPermit({ example }: { example: PortalExample }) {
  const { detail } = example;
  const app = detail.application;
  const rec = detail.versions.find((v) => v.version === app.version)?.recommendation ?? null;
  const [result, setResult] = useState<ReviewerActionInput | null>(null);
  const waiting = app.status === "awaiting_official";

  async function submit(action: ReviewerActionInput) {
    setResult(action);
    return null;
  }

  const approved = result && result.type !== "return";
  const returned = result?.type === "return" ? result : null;
  // Before a choice, the hidden "approved" block carries the recommended conditions (static copy).
  const conditions = result ? (result.type === "approve" ? result.conditions : []) : (rec?.conditions ?? []);

  const outcome = waiting ? (
    <div data-demo-outcome className="contents">
      <section data-result="approve" hidden={!approved} aria-labelledby="demo-approved" className="flex flex-col gap-4">
        <h2 id="demo-approved" className="text-lg text-ink">
          Approved
        </h2>
        {conditions.length > 0 && (
          <Callout tone="warning" title="Conditions of approval">
            <ul className="list-disc pl-5">
              {conditions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Callout>
        )}
        <SignatureBlock name={DEMO_OFFICIAL} signedAt="Just now" permitNumber={app.permitNumber} />
        <ResetButton onReset={() => setResult(null)} />
      </section>
      <section data-result="return" hidden={!returned} className="flex flex-col gap-4">
        <Callout tone="warning" title="Returned for fixes by you">
          <div className="flex flex-col gap-2">
            <p data-result-reason>{returned?.reason}</p>
            <ul data-result-fixes className="list-disc pl-5">
              {returned?.requestedFixes.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </Callout>
        <ResetButton onReset={() => setResult(null)} />
      </section>
    </div>
  ) : undefined;

  // After a decision in the demo, the page shows the permit as decided.
  const decided: typeof detail = result
    ? {
        ...detail,
        application: { ...app, status: result.type === "return" ? "returned" : "approved", decidedAt: new Date().toISOString() },
      }
    : detail;

  return (
    <ReviewWorkspace
      detail={decided}
      version={app.version}
      previews={example.previews}
      loadCalcBefore={example.existingServiceLoadCalc}
      backHref="/design/portal"
      note="Example permit. Every person, company and document in it is fictional."
      outcome={outcome}
      recordEditable
      actions={waiting && !result ? <ChangeStatus app={app} rec={rec} onSubmit={submit} keepMounted /> : undefined}
    />
  );
}

function ResetButton({ onReset }: { onReset: () => void }) {
  return (
    <div>
      <Button variant="secondary" size="sm" onClick={onReset} data-demo-reset="">
        Undo the decision
      </Button>
    </div>
  );
}
