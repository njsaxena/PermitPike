"use client";

import { Fragment, useState, type ReactNode } from "react";
import useSWR from "swr";
import { Check, ChevronRight, RefreshCw, X } from "lucide-react";
import { JOB_TYPE_LABELS, type EvalCaseResult, type EvalRun } from "@permitpike/contract";
import {
  Button,
  DecisionChip,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { api } from "@/lib/api-client";
import { cx } from "@/lib/cx";
import { decisionMatchPct, hasRuleDetail, history, ruleGroups, sortCases, summarize } from "@/lib/evals";
import { clockTime, longDate } from "@/lib/format";

/**
 * How well the rule packs and load calculation do on the labeled cases in /evals/cases.
 * Every number comes from the eval runs `pnpm evals` saves; nothing here is estimated.
 */
export function EvalDashboard() {
  const { data, error, isValidating, mutate } = useSWR("evals", () => api.listEvals(), {
    revalidateOnFocus: false,
  });
  const latest = data?.runs[0];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-title text-ink">Evals</h1>
        <Button
          variant="secondary"
          size="sm"
          loading={isValidating}
          icon={<RefreshCw className="size-4" strokeWidth={1.75} aria-hidden />}
          onClick={() => void mutate()}
        >
          Refresh
        </Button>
      </div>

      {error && !data && <p className="text-critical">Could not load the eval runs. Try Refresh.</p>}
      {data && !latest && (
        <EmptyState
          drawing="city-hall"
          message="No eval runs yet"
          action={
            <p className="text-base text-ink">
              Run <code className="border border-border bg-sunken px-1.5 py-0.5 font-mono text-sm">pnpm evals</code>{" "}
              with <code className="font-mono text-sm">DATABASE_URL</code> set.
            </p>
          }
        />
      )}
      {latest && (
        <>
          <LatestRun run={latest} />
          <RuleTable run={latest} />
          <CaseTable run={latest} />
          <History runs={history(data.runs)} />
        </>
      )}
    </div>
  );
}

// --- Latest run -------------------------------------------------------------

function pctText(n: number, d: number) {
  return d === 0 ? "n/a" : `${((n / d) * 100).toFixed(1)}%`;
}

function Tile({ value, label, tone, icon }: { value: string; label: string; tone?: "critical" | "positive"; icon?: ReactNode }) {
  return (
    <div
      className={cx(
        "flex flex-col gap-1 border p-5",
        tone === "critical" ? "border-critical bg-critical-tint" : tone === "positive" ? "border-positive bg-positive-tint" : "border-border bg-surface",
      )}
    >
      <span
        className={cx(
          "flex items-center gap-2 font-mono text-title tabular-nums",
          tone === "critical" ? "text-critical" : tone === "positive" ? "text-positive" : "text-ink",
        )}
      >
        {icon}
        {value}
      </span>
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}

function LatestRun({ run }: { run: EvalRun }) {
  const s = summarize(run);
  const danger = s.dangerousMisses > 0;
  return (
    <section aria-labelledby="latest-run" className="flex flex-col gap-4">
      <h2 id="latest-run" className="text-lg text-ink">
        Latest run
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile value={`${s.passed} / ${s.total}`} label="cases passed" />
        <Tile value={pctText(s.decisionMatches, s.total)} label={`decision match (${s.decisionMatches} of ${s.total})`} />
        <Tile
          value={String(s.dangerousMisses)}
          label="dangerous misses (recommended approve, should be returned)"
          tone={danger ? "critical" : "positive"}
          icon={
            danger ? (
              <X aria-hidden className="size-5" strokeWidth={2.5} />
            ) : (
              <Check aria-hidden className="size-5" strokeWidth={2.5} />
            )
          }
        />
        <Tile value={String(s.falseFlags)} label="false flags (returned for fixes, should have passed)" />
      </div>
      <dl className="grid gap-x-8 gap-y-2 border border-border bg-surface p-5 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
        <dt className="text-muted">Ran</dt>
        <dd className="text-ink">
          <span className="font-semibold">{longDate(run.ranAt)}</span> at {clockTime(run.ranAt)}
        </dd>
        <dt className="text-muted">Git commit</dt>
        <dd className="font-mono text-ink" title={run.gitSha ?? undefined}>
          {run.gitSha ? run.gitSha.slice(0, 7) : "Not recorded"}
        </dd>
        <dt className="text-muted">Model</dt>
        <dd className="font-mono break-words text-ink">{run.model}</dd>
      </dl>
      <p className="text-base text-ink">
        Rule packs and load calculation on {run.totalCases} labeled cases. Gemini extraction and the hosted agent are not
        scored yet.
      </p>
    </section>
  );
}

// --- Per-rule table ---------------------------------------------------------

function AccuracyBar({ value }: { value: number }) {
  return (
    <span className="flex items-center justify-end gap-3">
      <span className="font-mono text-sm tabular-nums">{(value * 100).toFixed(1)}%</span>
      <span aria-hidden className="h-2 w-20 shrink-0 border border-border-strong bg-sunken">
        <span className="block h-full bg-ink" style={{ width: `${value * 100}%` }} />
      </span>
    </span>
  );
}

function RuleTable({ run }: { run: EvalRun }) {
  return (
    <section aria-labelledby="per-rule" className="flex flex-col gap-4">
      <h2 id="per-rule" className="text-lg text-ink">
        Accuracy by rule
      </h2>
      {!hasRuleDetail(run) ? (
        <p className="text-base text-ink">
          This run was saved before rule-level results were recorded. Run{" "}
          <code className="font-mono text-sm">pnpm evals</code> again to fill this table.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {ruleGroups(run).map((g) => (
            <div key={g.jobType} className="flex flex-col gap-2">
              <h3 className="text-base font-semibold text-ink">{JOB_TYPE_LABELS[g.jobType]}</h3>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeader>Rule</TableHeader>
                    <TableHeader numeric>Cases</TableHeader>
                    <TableHeader numeric>Correct</TableHeader>
                    <TableHeader numeric>Accuracy</TableHeader>
                  </tr>
                </TableHead>
                <TableBody>
                  {g.rules.map((r) => (
                    <TableRow key={r.ruleId}>
                      <TableCell mono>{r.ruleId}</TableCell>
                      <TableCell numeric>{r.cases}</TableCell>
                      <TableCell numeric>{r.correct}</TableCell>
                      <TableCell className="w-48">
                        <AccuracyBar value={r.accuracy} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// --- Cases ------------------------------------------------------------------

function PassChip({ passed }: { passed: boolean }) {
  const Icon = passed ? Check : X;
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1.5 border px-2 text-sm font-semibold whitespace-nowrap",
        passed ? "border-positive bg-positive-tint text-positive" : "border-critical bg-critical-tint text-critical",
      )}
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={3} />
      {passed ? "Pass" : "Fail"}
    </span>
  );
}

function RuleList({ ids, other }: { ids: string[] | undefined; other: string[] | undefined }) {
  if (!ids) return <p className="text-sm text-muted">Not recorded in this run</p>;
  if (ids.length === 0) return <p className="text-sm text-ink">None</p>;
  const otherSet = new Set(other ?? []);
  return (
    <ul className="flex flex-col gap-1">
      {ids.map((id) => (
        <li key={id} className={cx("font-mono text-sm", otherSet.has(id) ? "text-ink" : "font-semibold text-critical")}>
          {id}
          {!otherSet.has(id) && <span className="sr-only"> (differs)</span>}
        </li>
      ))}
    </ul>
  );
}

function flagText(v: boolean | undefined) {
  return v === undefined ? "Not recorded" : v ? "Eversource flag" : "No flag";
}

function CaseDetail({ c }: { c: EvalCaseResult }) {
  const flagDiffers = c.expectedUtilityFlag !== undefined && c.expectedUtilityFlag !== c.actualUtilityFlag;
  return (
    <div className="grid gap-6 bg-sunken p-5 sm:grid-cols-3">
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-ink">Expected failing rules</h4>
        <RuleList ids={c.expectedFailingRuleIds} other={c.actualFailingRuleIds} />
      </div>
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-ink">Actual failing rules</h4>
        <RuleList ids={c.actualFailingRuleIds} other={c.expectedFailingRuleIds} />
      </div>
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-ink">Utility flag</h4>
        <p className="text-sm text-ink">Expected: {flagText(c.expectedUtilityFlag)}</p>
        <p className={cx("text-sm", flagDiffers ? "font-semibold text-critical" : "text-ink")}>
          Actual: {flagText(c.actualUtilityFlag)}
        </p>
      </div>
      {c.notes && <p className="text-sm text-ink sm:col-span-3">{c.notes}</p>}
    </div>
  );
}

function CaseTable({ run }: { run: EvalRun }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section aria-labelledby="cases" className="flex flex-col gap-4">
      <h2 id="cases" className="text-lg text-ink">
        Cases
      </h2>
      <Table>
        <TableHead>
          <tr>
            <TableHeader>Case</TableHeader>
            <TableHeader>Job</TableHeader>
            <TableHeader>Expected</TableHeader>
            <TableHeader>Actual</TableHeader>
            <TableHeader>Result</TableHeader>
          </tr>
        </TableHead>
        <TableBody>
          {sortCases(run.results).map((c) => {
            const isOpen = open.has(c.caseId);
            return (
              <Fragment key={c.caseId}>
                <TableRow interactive onClick={() => toggle(c.caseId)}>
                  <TableCell>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`case-${c.caseId}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(c.caseId);
                      }}
                      className="flex items-center gap-1.5 text-left font-mono text-sm"
                    >
                      <ChevronRight
                        aria-hidden
                        className={cx("size-4 shrink-0 transition-transform duration-100", isOpen && "rotate-90")}
                        strokeWidth={1.75}
                      />
                      {c.caseId}
                    </button>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{JOB_TYPE_LABELS[c.jobType]}</TableCell>
                  <TableCell>
                    <DecisionChip decision={c.expectedDecision} srLabel="" />
                  </TableCell>
                  <TableCell>
                    <DecisionChip decision={c.actualDecision} srLabel="" />
                  </TableCell>
                  <TableCell>
                    <PassChip passed={c.passed} />
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <tr id={`case-${c.caseId}`} className="border-b border-border">
                    <td colSpan={5}>
                      <CaseDetail c={c} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}

// --- History ----------------------------------------------------------------

const W = 640;
const H = 180;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

function History({ runs }: { runs: EvalRun[] }) {
  const [active, setActive] = useState<number | null>(null);
  const points = runs
    .map((run, i) => ({ run, pct: decisionMatchPct(run), i }))
    .filter((p): p is { run: EvalRun; pct: number; i: number } => p.pct !== null);
  const x = (i: number) =>
    runs.length === 1 ? PAD.left + (W - PAD.left - PAD.right) / 2 : PAD.left + (i / (runs.length - 1)) * (W - PAD.left - PAD.right);
  const y = (pct: number) => PAD.top + (1 - pct / 100) * (H - PAD.top - PAD.bottom);
  const line = points.map((p) => `${x(p.i)},${y(p.pct)}`).join(" ");
  const shown = active === null ? null : points.find((p) => p.i === active);

  return (
    <section aria-labelledby="history" className="flex flex-col gap-4">
      <h2 id="history" className="text-lg text-ink">
        Decision match, last {runs.length === 1 ? "run" : `${runs.length} runs`}
      </h2>
      <div className="max-w-[640px] border border-border bg-surface p-4">
        <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Decision match over the last ${runs.length} runs`}>
          {[0, 50, 100].map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.35em" textAnchor="end" className="fill-muted font-mono text-label tabular-nums">
                {t}%
              </text>
            </g>
          ))}
          {points.length > 1 && <polyline points={line} fill="none" className="stroke-ink" strokeWidth={2} />}
          {points.map((p) => (
            <g
              key={p.run.id}
              tabIndex={0}
              role="button"
              aria-label={`${longDate(p.run.ranAt)} ${clockTime(p.run.ranAt)}: ${p.pct.toFixed(1)}% decision match, commit ${p.run.gitSha?.slice(0, 7) ?? "not recorded"}`}
              onMouseEnter={() => setActive(p.i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(p.i)}
              onBlur={() => setActive(null)}
              className="cursor-default outline-none"
            >
              {/* Hit target larger than the mark. */}
              <rect x={x(p.i) - 12} y={y(p.pct) - 12} width={24} height={24} fill="transparent" />
              <rect
                x={x(p.i) - (active === p.i ? 6 : 4)}
                y={y(p.pct) - (active === p.i ? 6 : 4)}
                width={active === p.i ? 12 : 8}
                height={active === p.i ? 12 : 8}
                className="fill-ink stroke-surface"
                strokeWidth={2}
              />
            </g>
          ))}
          {runs.length > 1 && (
            <>
              <text x={PAD.left} y={H - 6} className="fill-muted text-label">
                Oldest
              </text>
              <text x={W - PAD.right} y={H - 6} textAnchor="end" className="fill-muted text-label">
                Latest
              </text>
            </>
          )}
        </svg>
        {shown && (
          <div
            role="status"
            className="pointer-events-none absolute border border-ink bg-surface px-3 py-2 text-sm whitespace-nowrap text-ink"
            style={{
              left: `calc(${(x(shown.i) / W) * 100}% + 8px)`,
              top: `${(y(shown.pct) / H) * 100}%`,
              transform: x(shown.i) > W * 0.6 ? "translate(calc(-100% - 24px), -50%)" : "translate(8px, -50%)",
            }}
          >
            <span className="block font-mono font-semibold tabular-nums">{shown.pct.toFixed(1)}%</span>
            <span className="block font-mono">{shown.run.gitSha?.slice(0, 7) ?? "No commit recorded"}</span>
            <span className="block text-muted">
              {longDate(shown.run.ranAt)}, {clockTime(shown.run.ranAt)}
            </span>
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
