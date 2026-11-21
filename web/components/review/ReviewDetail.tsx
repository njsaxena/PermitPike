"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import type { ApplicationDetail, CheckResult, ReviewerAction, ReviewerActionInput } from "@permitpike/contract";
import {
  Button,
  Callout,
  CheckRow,
  PropertyCard,
  CheckRowRunning,
  CheckSummary,
  ConfirmDialog,
  RecommendationCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  TrailTimeline,
  formatBytes,
} from "@/components/ui";
import { Decision } from "@/components/permit/Decision";
import { PermitHeading } from "@/components/permit/PermitHeading";
import { api, ApiRequestError, POLL_MS } from "@/lib/api-client";
import { stamp } from "@/lib/format";
import { trailSteps } from "@/lib/trail";

const ORDER: Record<CheckResult["status"], number> = { fail: 0, warn: 1, pass: 2 };
const STALE = "This permit was updated, reload.";

/**
 * One permit for an official. The version shown is pinned when the page loads; if the
 * applicant resubmits meanwhile, the page says so and the server rejects actions on the
 * old version.
 */
export function ReviewDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data, error, mutate } = useSWR(["application", id], () => api.getApplication(id), {
    refreshInterval: POLL_MS,
  });
  const [pinned, setPinned] = useState<number | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (data && pinned === null) setPinned(data.application.version);
  }, [data, pinned]);
  useEffect(() => {
    if (error instanceof ApiRequestError && error.code === "unauthorized") router.refresh();
  }, [error, router]);

  if (error && !data) {
    const missing = error instanceof ApiRequestError && error.code === "not_found";
    return <p className="text-critical">{missing ? "We can't find that permit." : "Could not load this permit. Retrying."}</p>;
  }
  if (!data || pinned === null) return null;

  const app = data.application;
  const shown = data.versions.find((v) => v.version === pinned) ?? data.versions.at(-1)!;
  const rec = shown.recommendation;
  const isStale = stale || app.version !== pinned;
  const checking = app.status === "submitted" || app.status === "ai_review";

  function reload() {
    setStale(false);
    setPinned(app.version);
    void mutate();
  }

  return (
    <div className="flex flex-col gap-8">
      <Link href="/review" className="pp-link self-start text-sm">
        Back to the queue
      </Link>
      <PermitHeading app={app} />
      <p className="text-sm text-ink">
        Filed by {app.applicant.name}
        {app.applicant.company ? `, ${app.applicant.company}` : ""} ·{" "}
        <span className="font-mono">License {app.applicant.licenseNumber}</span>
        {pinned > 1 && <span className="font-mono text-muted"> · Version {pinned}</span>}
      </p>

      {isStale && (
        <Callout tone="warning" title={STALE}>
          <Button variant="secondary" size="sm" className="mt-2" onClick={reload}>
            Reload
          </Button>
        </Callout>
      )}

      <TrailTimeline steps={trailSteps(data)} />

      {checking && pinned === app.version && (
        <div className="flex flex-col gap-2">
          <CheckRowRunning title="Reading the documents" />
          <CheckRowRunning title="Running the load calculation and code checks" />
        </div>
      )}

      {rec && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="flex flex-col gap-4">
            <RecommendationCard
              decision={rec.decision}
              confidence={rec.confidence}
              summary={rec.summary}
              conditions={rec.conditions}
              meta={`${rec.model} · ${stamp(rec.createdAt)}`}
            />
            {rec.utilityFlag && (
              <Callout tone="utility" title={`${rec.utilityFlag.utility}: ${rec.utilityFlag.reason}`}>
                {rec.utilityFlag.action}
              </Callout>
            )}
            <PropertyCard
              parcel={app.parcel}
              address={app.address}
              setbackCheck={rec.checks.some((c) => c.ruleId.endsWith("setback"))}
            />
          </div>
          <section aria-labelledby="checks" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="checks" className="text-lg text-ink">
                Checks
              </h2>
              <CheckSummary checks={rec.checks} size="sm" />
            </div>
            <ul data-motion="rows" className="flex flex-col gap-2">
              {[...rec.checks]
                .sort((a, b) => ORDER[a.status] - ORDER[b.status])
                .map((c) => (
                  <li key={c.ruleId}>
                    <CheckRow {...c} />
                  </li>
                ))}
            </ul>
          </section>
        </div>
      )}

      {app.closureRisk && (
        <section aria-labelledby="closure-risk" className="flex max-w-2xl flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="closure-risk" className="text-lg font-semibold text-ink">
              Historical closure risk
            </h2>
            <span className="font-semibold capitalize text-ink">{app.closureRisk.band}</span>
          </div>
          <p className="text-sm text-muted">Model estimate, separate from the recommendation.</p>
          {app.closureRisk.reasons.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-ink">
              {app.closureRisk.reasons.map((reason, index) => (
                <li key={`${index}-${reason}`}>{reason}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!rec && <PropertyCard parcel={app.parcel} address={app.address} className="max-w-xl" />}

      {!rec && !checking && (
        <Callout title="PermitPike could not review this application. Check the documents yourself." />
      )}

      <section aria-labelledby="documents" className="flex flex-col gap-3">
        <h2 id="documents" className="text-lg text-ink">
          Documents
        </h2>
        <ul className="flex flex-col gap-2">
          {shown.files.map((f) => (
            <li key={f.id} className="flex flex-wrap items-baseline gap-x-3">
              <a href={f.url} target="_blank" rel="noreferrer" className="pp-link">
                {f.name}
              </a>
              <span className="font-mono text-sm text-muted">{formatBytes(f.sizeBytes)}</span>
            </li>
          ))}
        </ul>
        {shown.note && <p className="text-ink">Applicant's note: {shown.note}</p>}
      </section>

      {app.status === "awaiting_official" && !isStale && (
        <ReviewActions detail={data} version={pinned} onStale={() => setStale(true)} onDone={() => void mutate()} />
      )}

      <Decision detail={data} />
      {data.actions.length > 0 && <AuditLog actions={data.actions} />}
    </div>
  );
}

type Dialog = "approve" | "return" | null;

function ReviewActions({
  detail,
  version,
  onStale,
  onDone,
}: {
  detail: ApplicationDetail;
  version: number;
  onStale: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const app = detail.application;
  const rec = detail.versions.find((v) => v.version === version)?.recommendation ?? null;
  const failing = rec?.checks.filter((c) => c.status === "fail") ?? [];
  // Approving against a "return" recommendation, or past failing checks, is an override.
  const approveIsOverride = rec?.decision === "return_for_fixes" || failing.length > 0;
  const defaultFixes = (rec?.checks ?? [])
    .filter((c) => c.status !== "pass" && c.suggestedFix)
    .map((c) => c.suggestedFix)
    .join("\n");

  const [open, setOpen] = useState<Dialog>(null);
  const [reason, setReason] = useState("");
  const [fixes, setFixes] = useState(defaultFixes);
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(null);
    setReasonError(undefined);
  }

  async function send(action: ReviewerActionInput) {
    setBusy(true);
    setError(null);
    try {
      await api.reviewApplication(app.id, { expectedVersion: version, action });
      close();
      onDone();
    } catch (err) {
      close();
      if (err instanceof ApiRequestError && err.code === "conflict") onStale();
      else if (err instanceof ApiRequestError && err.code === "unauthorized") router.refresh();
      else setError(err instanceof Error ? err.message : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function confirmApprove() {
    if (approveIsOverride) {
      if (!reason.trim()) return setReasonError("Explain why you are approving against the recommendation.");
      return send({
        type: "override",
        reason: reason.trim(),
        finalDecision: "approved",
        overriddenRuleIds: failing.map((c) => c.ruleId),
      });
    }
    return send({ type: "approve", conditions: rec?.conditions ?? [], note: null });
  }

  function confirmReturn() {
    if (!reason.trim()) return setReasonError("Tell the electrician why it is coming back.");
    return send({
      type: "return",
      reason: reason.trim(),
      requestedFixes: fixes
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    });
  }

  return (
    <section aria-labelledby="decide" className="flex flex-col gap-4 border-t border-border pt-8">
      <h2 id="decide" className="text-lg text-ink">
        Your decision
      </h2>
      {error && <p className="text-sm text-critical">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setOpen("approve")} loading={busy && open === "approve"}>
          {approveIsOverride ? "Approve anyway" : "Approve"}
        </Button>
        <Button variant="secondary" onClick={() => setOpen("return")} loading={busy && open === "return"}>
          Return for fixes
        </Button>
      </div>

      <ConfirmDialog
        open={open === "approve"}
        onClose={close}
        onConfirm={() => void confirmApprove()}
        title={`Approve ${app.permitNumber}`}
        attestation="I reviewed this application and its documents."
        confirmLabel="Approve and sign"
      >
        <p>Your name and the time go on the permit, and the electrician sees it right away.</p>
        {!approveIsOverride && rec && rec.conditions.length > 0 && (
          <Callout tone="warning" title="Conditions of approval">
            <ul className="list-disc pl-5">
              {rec.conditions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Callout>
        )}
        {approveIsOverride && (
          <Textarea
            label="Why you are overriding PermitPike's recommendation"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={reasonError}
            required
          />
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={open === "return"}
        onClose={close}
        onConfirm={() => void confirmReturn()}
        title={`Return ${app.permitNumber} for fixes`}
        confirmLabel="Return to electrician"
        confirmVariant="secondary"
      >
        <Textarea
          label="Reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={reasonError}
          required
        />
        <Textarea label="Fixes to request, one per line" rows={4} value={fixes} onChange={(e) => setFixes(e.target.value)} />
      </ConfirmDialog>
    </section>
  );
}

const ACTION_LABEL: Record<ReviewerAction["type"], string> = {
  approve: "Approved",
  return: "Returned for fixes",
  override: "Override",
};

function AuditLog({ actions }: { actions: ReviewerAction[] }) {
  return (
    <section aria-labelledby="audit" className="flex flex-col gap-3">
      <h2 id="audit" className="text-lg text-ink">
        Audit log
      </h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>When</TableHeader>
              <TableHeader>Official</TableHeader>
              <TableHeader>Action</TableHeader>
              <TableHeader>Reason</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...actions].reverse().map((a) => (
              <TableRow key={a.id}>
                <TableCell mono className="whitespace-nowrap">
                  {stamp(a.timestamp)}
                </TableCell>
                <TableCell>{a.actor.name}</TableCell>
                <TableCell>
                  {a.type === "override" ? `Override: ${a.finalDecision}` : ACTION_LABEL[a.type]}
                  <span className="block font-mono text-sm text-muted">Version {a.version}</span>
                </TableCell>
                <TableCell>{a.type === "approve" ? (a.note ?? "") : a.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
