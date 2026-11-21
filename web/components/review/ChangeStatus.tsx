"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, CircleCheck, CornerUpLeft, TriangleAlert } from "lucide-react";
import type { Application, Recommendation, ReviewerActionInput } from "@permitpike/contract";
import { Button, Callout, Checkbox, ConfirmDialog, StatusChip, Textarea } from "@/components/ui";
import type { Step0Draft } from "@/lib/step0";
import { cx } from "@/lib/cx";

/*
 * The official's decision, top right of the permit. "Change status" opens the two ways a
 * permit can move on: approve, or return for fixes. Each opens its own confirmation.
 * PermitPike only recommends; these, and only these, change the permit. Approving past a
 * failing check or a "return" recommendation is an override and needs a written reason.
 * When the permit has a utility flag, either dialog can attach the Eversource Step 0 draft
 * to the message the electrician gets. Off by default: the official decides whether it goes.
 */

export function ChangeStatus({
  app,
  rec,
  onSubmit,
  keepMounted,
  step0,
}: {
  app: Application;
  rec: Recommendation | null;
  /** The draft the electrician would get. Only offered when the permit has a utility flag. */
  step0?: Step0Draft | null;
  /** Saves the action. Resolves to an error message, or null when it worked. */
  onSubmit: (action: ReviewerActionInput) => Promise<string | null>;
  /** Keep dialog content in the page while closed (static copies of the page). */
  keepMounted?: boolean;
}) {
  const failing = rec?.checks.filter((c) => c.status === "fail") ?? [];
  const isOverride = rec?.decision === "return_for_fixes" || failing.length > 0;
  const conditions = rec?.conditions ?? [];
  const defaultFixes = (rec?.checks ?? [])
    .filter((c) => c.status !== "pass" && c.suggestedFix)
    .map((c) => c.suggestedFix)
    .join("\n");

  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState<"approve" | "return" | null>(null);
  const [reason, setReason] = useState("");
  const [fixes, setFixes] = useState(defaultFixes);
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [sendStep0, setSendStep0] = useState(false);
  const offerStep0 = !!rec?.utilityFlag && !!step0;
  const attach = offerStep0 && sendStep0 ? step0!.text : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  // The menu closes on Escape (focus back on the button) and on a click anywhere else.
  useEffect(() => {
    if (!menu) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenu(false);
        wrap.current?.querySelector<HTMLButtonElement>("[data-menu-toggle]")?.focus();
      }
    }
    function onDown(e: MouseEvent) {
      if (!wrap.current?.contains(e.target as Node)) setMenu(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [menu]);

  const menuId = `status-menu-${app.id}`;

  function choose(which: "approve" | "return") {
    setMenu(false);
    setOpen(which);
  }

  function close() {
    setOpen(null);
    setReasonError(undefined);
    setSendStep0(false);
  }

  async function send(action: ReviewerActionInput) {
    setBusy(true);
    setError(null);
    const problem = await onSubmit(action);
    setBusy(false);
    close();
    if (problem) setError(problem);
  }

  function confirmApprove() {
    if (isOverride) {
      if (!reason.trim()) return setReasonError("Explain why you are approving against the recommendation.");
      return void send({
        type: "override",
        // The draft goes after the official's reason, where the electrician reads it.
        reason: attach ? `${reason.trim()}\n\n${attach}` : reason.trim(),
        finalDecision: "approved",
        overriddenRuleIds: failing.map((c) => c.ruleId),
      });
    }
    return void send({ type: "approve", conditions, note: attach });
  }

  function confirmReturn() {
    if (!reason.trim()) return setReasonError("Tell the electrician why it is coming back.");
    return void send({
      type: "return",
      reason: reason.trim(),
      // Not in the reason: the reason is shown on the public status page; requested fixes are not.
      requestedFixes: [
        ...fixes
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        ...(attach ? [attach] : []),
      ],
    });
  }

  return (
    <div ref={wrap} data-status-control className="relative flex flex-col items-start gap-2 sm:items-end">
      <Button
        onClick={() => setMenu((m) => !m)}
        loading={busy}
        aria-expanded={menu}
        aria-controls={menuId}
        data-menu-toggle={menuId}
      >
        Change status
        <ChevronDown aria-hidden className="size-4" strokeWidth={2} />
      </Button>
      {error && <p className="text-sm font-semibold text-critical">{error}</p>}

      <div
        id={menuId}
        hidden={!menu}
        className="absolute top-full left-0 z-30 mt-2 w-[min(24rem,calc(100vw-2rem))] border border-ink bg-surface sm:right-0 sm:left-auto"
      >
        <p className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 text-sm text-muted">
          Status now
          <StatusChip status={app.status} />
        </p>
        <ul className="flex flex-col">
          {/* The recommended move comes first. */}
          {rec?.decision === "return_for_fixes" ? (
            <>
              <StatusOption
                icon={CornerUpLeft}
                iconClass="text-ink"
                title="Return for fixes"
                recommended
                onClick={() => choose("return")}
                dialog={`return-${app.id}`}
              />
              <StatusOption
                icon={isOverride ? TriangleAlert : CircleCheck}
                iconClass={isOverride ? "text-warning" : "text-positive"}
                title="Approve"
                recommended={!isOverride && !!rec}
                onClick={() => choose("approve")}
                dialog={`approve-${app.id}`}
              />
            </>
          ) : (
            <>
              <StatusOption
                icon={isOverride ? TriangleAlert : CircleCheck}
                iconClass={isOverride ? "text-warning" : "text-positive"}
                title="Approve"
                recommended={!isOverride && !!rec}
                onClick={() => choose("approve")}
                dialog={`approve-${app.id}`}
              />
              <StatusOption
                icon={CornerUpLeft}
                iconClass="text-ink"
                title="Return for fixes"
                recommended={false}
                onClick={() => choose("return")}
                dialog={`return-${app.id}`}
              />
            </>
          )}
        </ul>
      </div>

      <ConfirmDialog
        id={`approve-${app.id}`}
        keepMounted={keepMounted}
        open={open === "approve"}
        onClose={close}
        onConfirm={confirmApprove}
        title={`Approve ${app.permitNumber}`}
        attestation="I reviewed this application, its documents and the load calculation."
        confirmLabel="Approve and sign"
      >
        <p>Your name and the time go on the permit, and the electrician sees it right away.</p>
        {!isOverride && conditions.length > 0 && (
          <Callout tone="warning" title="Conditions of approval">
            <ul className="list-disc pl-5">
              {conditions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Callout>
        )}
        {isOverride && (
          <>
            <Callout
              tone="warning"
              title={`You are overriding ${failing.length || "the"} failing ${failing.length === 1 ? "check" : "checks"}`}
            >
              <ul className="list-disc pl-5">
                {failing.map((c) => (
                  <li key={c.ruleId}>
                    {c.title} ({c.citation})
                  </li>
                ))}
              </ul>
            </Callout>
            <Textarea
              label="Why you are approving against the recommendation"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              error={reasonError}
              required
              data-reason=""
            />
          </>
        )}
        {offerStep0 && (
          <Checkbox
            label="Send the Eversource Step 0 draft to the electrician"
            description="Goes with your message, without the load calculation. PermitPike does not send it to Eversource."
            checked={sendStep0}
            onChange={(e) => setSendStep0(e.target.checked)}
            data-send-step0=""
          />
        )}
      </ConfirmDialog>

      <ConfirmDialog
        id={`return-${app.id}`}
        keepMounted={keepMounted}
        open={open === "return"}
        onClose={close}
        onConfirm={confirmReturn}
        title={`Return ${app.permitNumber} for fixes`}
        confirmLabel="Return to electrician"
        confirmVariant="secondary"
      >
        <p>The electrician gets your reason and the fixes below, and can resubmit.</p>
        <Textarea
          label="Reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={reasonError}
          required
          data-reason=""
        />
        <Textarea
          label="Fixes to request, one per line"
          rows={4}
          value={fixes}
          onChange={(e) => setFixes(e.target.value)}
          data-fixes=""
        />
        {offerStep0 && (
          <Checkbox
            label="Send the Eversource Step 0 draft to the electrician"
            description="Goes with your message, without the load calculation. PermitPike does not send it to Eversource."
            checked={sendStep0}
            onChange={(e) => setSendStep0(e.target.checked)}
            data-send-step0=""
          />
        )}
      </ConfirmDialog>
    </div>
  );
}

function StatusOption({
  icon: Icon,
  iconClass,
  title,
  recommended,
  onClick,
  dialog,
}: {
  icon: typeof CircleCheck;
  iconClass: string;
  title: string;
  recommended: boolean;
  onClick: () => void;
  /** The dialog this option opens (static copies wire it by this id). */
  dialog: string;
}) {
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onClick}
        data-dialog-open={dialog}
        className="grid w-full grid-cols-[20px_minmax(0,1fr)] gap-3 px-4 py-3 text-left transition-colors duration-100 ease-out hov:bg-hover"
      >
        <Icon aria-hidden className={cx("mt-0.5 size-5", iconClass)} strokeWidth={1.75} />
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold text-ink">{title}</span>
          {recommended && <span className="text-sm font-semibold text-positive">PermitPike recommends this</span>}
        </span>
      </button>
    </li>
  );
}
