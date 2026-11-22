"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowLeft, ExternalLink, FileSearch } from "lucide-react";
import {
  JOB_TYPE_LABELS,
  type ApplicationDetail,
  type CheckStatus,
  type ExtractedFields,
  type FileKind,
  type LoadCalcResult,
  type ReviewerAction,
} from "@permitpike/contract";
import {
  Callout,
  CheckRow,
  CheckRowRunning,
  CheckSummary,
  RecommendationCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TrailTimeline,
} from "@/components/ui";
import { Decision } from "@/components/permit/Decision";
import { PermitHeading } from "@/components/permit/PermitHeading";
import { Step0DraftCard } from "@/components/permit/Step0Draft";
import { clockTime, longDate } from "@/lib/format";
import { DOCUMENT_LABEL, RULE_FIELDS, codeSource, ruleDocument, sourcesFor } from "@/lib/review-sources";
import { buildStep0Draft } from "@/lib/step0";
import { trailSteps } from "@/lib/trail";
import { DocumentViewer, docTabId, type ViewerFile } from "./DocumentViewer";
import { LoadCalcPanel } from "./LoadCalcPanel";
import { PermitRecord } from "./PermitRecord";

/*
 * One permit, laid out for a building official. Documents on the left, held in view
 * while reading; PermitPike's recommendation and the evidence for it on the right:
 * checks with their code sources, the permit record (editable by the official), the
 * worked load calculation, what the inspector will look at, and the history. The
 * official changes the status from the top right.
 * Used by /review/[id] (live data) and the portal demo on /design (example library).
 */

const ORDER: Record<CheckStatus, number> = { fail: 0, warn: 1, pass: 2 };

export interface ReviewWorkspaceProps {
  detail: ApplicationDetail;
  /** The version on screen (pinned when the page loaded). */
  version: number;
  /** First-page images for PDFs, by file id. */
  previews?: Record<string, string>;
  /** The same load on the existing service, when the job upgrades it. */
  loadCalcBefore?: LoadCalcResult | null;
  backHref: string;
  archiveHref?: string;
  /** Shown under the heading, e.g. "This permit was updated". */
  notice?: ReactNode;
  /** One line under the applicant, e.g. that this is an example. */
  note?: ReactNode;
  /** Top right: the status control, when the permit is waiting on an official. */
  actions?: ReactNode;
  /** Whether the official can edit the permit record on this page. */
  recordEditable?: boolean;
  /** Replaces the recorded decision, e.g. the demo's result. */
  outcome?: ReactNode;
}

export function ReviewWorkspace({
  detail,
  version,
  previews = {},
  loadCalcBefore,
  backHref,
  archiveHref,
  notice,
  note,
  actions,
  recordEditable = false,
  outcome,
}: ReviewWorkspaceProps) {
  const app = detail.application;
  const shown = detail.versions.find((v) => v.version === version) ?? detail.versions.at(-1)!;
  const rec = shown.recommendation;
  // The record starts as what PermitPike read (and the electrician confirmed); the official may correct it.
  const [record, setRecord] = useState<ExtractedFields | null>(shown.extraction?.fields ?? null);
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set());
  const extraction = shown.extraction && record ? { ...shown.extraction, fields: record } : shown.extraction;
  const checking = (app.status === "submitted" || app.status === "ai_review") && version === app.version;
  const files: ViewerFile[] = shown.files.map((f) => ({ ...f, preview: previews[f.id] }));
  const kinds = new Set(files.map((f) => f.kind));

  // Each field a check read gets that check's result.
  const fieldStatus: Record<string, CheckStatus> = {};
  for (const c of rec?.checks ?? []) {
    for (const key of RULE_FIELDS[c.ruleId] ?? []) {
      if (!fieldStatus[key] || ORDER[c.status] < ORDER[fieldStatus[key]!]) fieldStatus[key] = c.status;
    }
  }

  const [doc, setDoc] = useState(files[0] ? docTabId(files[0].kind) : "");
  function showDocument(kind: FileKind) {
    setDoc(docTabId(kind));
    document.getElementById("documents-heading")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const failing = rec?.checks.filter((c) => c.status === "fail").length ?? 0;
  const lowOrMissing = shown.extraction
    ? [
        ...new Set([
          ...shown.extraction.missingFields,
          ...Object.entries(shown.extraction.fieldConfidence)
            .filter(([, v]) => v < 0.85)
            .map(([k]) => k),
        ]),
      ].filter((k) => !edited.has(k)).length
    : 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={backHref} className="pp-link inline-flex items-center gap-1.5 text-sm">
            <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
            Queue
          </Link>
          {archiveHref && (
            <Link href={archiveHref} className="pp-link inline-flex items-center gap-1.5 text-sm">
              <FileSearch aria-hidden className="size-4" strokeWidth={1.75} />
              Search permit archive
            </Link>
          )}
        </div>
        <PermitHeading
          app={app}
          viewer="official"
          actions={actions}
          facts={
            detail.versions.length > 1
              ? [{ label: "Version", value: `${version} of ${detail.versions.length}` }]
              : []
          }
        />
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>

      {notice}

      <TrailTimeline steps={trailSteps(detail)} />

      {outcome ?? <Decision detail={detail} />}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <DocumentViewer
          files={files}
          extraction={extraction}
          fieldStatus={fieldStatus}
          edited={edited}
          active={doc}
          onActiveChange={setDoc}
          className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto"
        />

        <div className="flex min-w-0 flex-col gap-6">
          {checking && (
            <ul className="flex flex-col border border-border bg-surface px-card">
              <CheckRowRunning title="Reading the documents" />
              <CheckRowRunning title="Running the load calculation and code checks" />
            </ul>
          )}

          {rec && (
            <RecommendationCard
              decision={rec.decision}
              confidence={rec.confidence}
              summary={rec.summary}
              conditions={rec.conditions}
              meta={`${rec.model} · ${longDate(rec.createdAt)} at ${clockTime(rec.createdAt)}`}
            />
          )}
          {rec?.utilityFlag && (
            <Callout tone="utility" title={`${rec.utilityFlag.utility}: ${rec.utilityFlag.reason}`}>
              {rec.utilityFlag.action}
            </Callout>
          )}
          {rec?.utilityFlag && (
            // From the record as it stands on screen, so the official's corrections carry into the draft.
            <Step0DraftCard draft={buildStep0Draft({ ...app, extraction }, rec.loadCalc)} />
          )}
          {!rec && !checking && (
            <Callout title="PermitPike could not review this application. Check the documents yourself." />
          )}
          {app.closureRisk && (
            <section aria-labelledby="closure-risk" className="flex flex-col gap-2 border border-border bg-surface px-card py-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 id="closure-risk" className="text-lg text-ink">
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

          <Tabs
            label="Review"
            items={[
              {
                id: "checks",
                label: "Checks",
                count: failing || undefined,
                disabled: !rec,
                content: rec && (
                  <section aria-label="Checks" className="flex flex-col gap-3">
                    <CheckSummary checks={rec.checks} size="sm" />
                    <ul className="border-t border-ink">
                      {[...rec.checks]
                        .sort((a, b) => ORDER[a.status] - ORDER[b.status])
                        .map((c) => {
                          const kind = ruleDocument(c.ruleId);
                          const target: FileKind | null = kinds.has(kind) ? kind : kinds.has("spec_sheet") ? "spec_sheet" : null;
                          const source = codeSource(c.citation);
                          return (
                            <CheckRow key={c.ruleId} {...c}>
                              {target && (
                                <button
                                  type="button"
                                  onClick={() => showDocument(target)}
                                  data-show-doc={docTabId(target)}
                                  className="inline-flex h-8 items-center gap-1.5 border border-border-strong bg-surface px-3 text-sm font-semibold text-ink transition-[background-color,box-shadow] duration-100 ease-out hov:wash"
                                >
                                  <FileSearch aria-hidden className="size-4" strokeWidth={1.75} />
                                  Show in {DOCUMENT_LABEL[target].toLowerCase()}
                                </button>
                              )}
                              {source && (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="pp-link inline-flex items-center gap-1 text-sm"
                                >
                                  {source.name}
                                  <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.75} />
                                  <span className="sr-only">(opens in a new tab)</span>
                                </a>
                              )}
                            </CheckRow>
                          );
                        })}
                    </ul>
                  </section>
                ),
              },
              {
                id: "record",
                label: "Permit record",
                count: lowOrMissing || undefined,
                disabled: !record,
                content: record && (
                  <PermitRecord
                    fields={record}
                    extraction={shown.extraction}
                    fieldStatus={fieldStatus}
                    edited={edited}
                    editable={recordEditable}
                    onSave={(next, rows) => {
                      setRecord(next);
                      setEdited((e) => new Set([...e, ...rows]));
                    }}
                  />
                ),
              },
              {
                id: "load",
                label: "Load calculation",
                disabled: !rec,
                content: rec && (
                  <LoadCalcPanel
                    calc={rec.loadCalc}
                    before={loadCalcBefore}
                    notRun={rec.checks.find((c) => c.ruleId === "shared.service_capacity")?.message}
                  />
                ),
              },
              {
                id: "inspection",
                label: "Inspection",
                disabled: !rec,
                content: rec && <InspectionPanel detail={detail} checklist={rec.inspectorChecklist} tip={rec.cleanEnergyTip} />,
              },
              {
                id: "history",
                label: "History",
                count: detail.versions.length > 1 ? detail.versions.length : undefined,
                content: <HistoryPanel detail={detail} />,
              },
            ]}
          />
        </div>
      </div>

    </div>
  );
}

function InspectionPanel({
  detail,
  checklist,
  tip,
}: {
  detail: ApplicationDetail;
  checklist: string[];
  tip: { message: string; program: string | null; url: string | null } | null;
}) {
  const sources = sourcesFor(detail.application.jobType);
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="inspector-list" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="inspector-list" className="font-semibold text-ink">
            Site inspection checklist
          </h3>
          <p className="max-w-prose text-sm text-muted">
            Approval isn&apos;t the last step. Once the work is done, a city electrical inspector visits the site and
            checks these items in person before the permit is closed.
          </p>
        </div>
        <ol className="border-t border-ink">
          {checklist.map((item, i) => (
            <li key={item} className="grid grid-cols-[24px_20px_minmax(0,1fr)] items-start gap-3 border-b border-border py-2.5">
              <span className="text-sm text-muted">{i + 1}</span>
              <span aria-hidden className="mt-0.5 size-4 border border-border-strong bg-surface" />
              <span className="text-ink">{item}</span>
            </li>
          ))}
        </ol>
      </section>

      {tip && (
        <Callout title={tip.program ?? "Clean energy"}>
          {tip.message}{" "}
          {tip.url && (
            <a href={tip.url} target="_blank" rel="noreferrer" className="pp-link">
              Program details
            </a>
          )}
        </Callout>
      )}

      <section aria-labelledby="code-sources" className="flex flex-col gap-3">
        <h3 id="code-sources" className="font-semibold text-ink">
          Code and city sources for {JOB_TYPE_LABELS[detail.application.jobType].toLowerCase()} permits
        </h3>
        <ul className="border-t border-ink">
          {sources.map((s) => (
            <li key={s.id} className="flex flex-col gap-0.5 border-b border-border py-2.5">
              <a href={s.url} target="_blank" rel="noreferrer" className="pp-link self-start">
                {s.title}
              </a>
              <span className="text-sm text-muted">
                {s.citation} · {s.jurisdiction}
                {s.edition ? ` · ${s.edition}` : ""}
                {s.effectiveDate ? ` · in effect since ${longDate(s.effectiveDate)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const DECISION_WORD = {
  approve: "Approve",
  approve_with_conditions: "Approve with conditions",
  return_for_fixes: "Return for fixes",
} as const;

const ACTION_LABEL: Record<ReviewerAction["type"], string> = {
  approve: "Approved",
  return: "Returned for fixes",
  override: "Overrode PermitPike",
};

function When({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} className="whitespace-nowrap">
      {longDate(iso)}
      <span className="block text-sm text-muted">{clockTime(iso)}</span>
    </time>
  );
}

function HistoryPanel({ detail }: { detail: ApplicationDetail }) {
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="versions" className="flex flex-col gap-3">
        <h3 id="versions" className="font-semibold text-ink">
          Submissions
        </h3>
        <div className="overflow-x-auto">
          <Table aria-label="Submissions">
            <TableHead>
              <TableRow>
                <TableHeader>Version</TableHeader>
                <TableHeader>Filed</TableHeader>
                <TableHeader>PermitPike</TableHeader>
                <TableHeader>Note</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...detail.versions].reverse().map((v) => (
                <TableRow key={v.version}>
                  <TableCell>{v.version}</TableCell>
                  <TableCell>
                    <When iso={v.submittedAt} />
                  </TableCell>
                  <TableCell className="min-w-36">
                    {v.recommendation ? DECISION_WORD[v.recommendation.decision] : <span className="text-muted">No review</span>}
                    <span className="block text-sm text-muted">
                      {v.files.length} {v.files.length === 1 ? "file" : "files"}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-40">{v.note ?? <span className="text-muted">Original filing</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section aria-labelledby="audit" className="flex flex-col gap-3">
        <h3 id="audit" className="font-semibold text-ink">
          Decisions
        </h3>
        {detail.actions.length === 0 ? (
          <p className="text-muted">No official has acted on this permit yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table aria-label="Decisions">
              <TableHead>
                <TableRow>
                  <TableHeader>When</TableHeader>
                  <TableHeader>Official</TableHeader>
                  <TableHeader>Action</TableHeader>
                  <TableHeader>Reason</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...detail.actions].reverse().map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <When iso={a.timestamp} />
                    </TableCell>
                    <TableCell>{a.actor.name}</TableCell>
                    <TableCell className="min-w-36">
                      {a.type === "override" ? `${ACTION_LABEL.override}: ${a.finalDecision}` : ACTION_LABEL[a.type]}
                      <span className="block text-sm text-muted">Version {a.version}</span>
                    </TableCell>
                    <TableCell className="min-w-40">{a.type === "approve" ? (a.note ?? "") : a.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
