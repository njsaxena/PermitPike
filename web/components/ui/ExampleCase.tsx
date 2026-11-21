import Link from "next/link";
import { Check, ChevronDown, TriangleAlert, X, Zap } from "lucide-react";
import {
  JOB_TYPE_LABELS,
  type CheckResult,
  type CheckStatus,
  type EvalCase,
  type RecommendationDecision,
} from "@permitpike/contract";
import { cx } from "@/lib/cx";
import type { FieldGroup } from "@/lib/example-fields";
import { CheckSummary } from "./CheckRow";

/*
 * The example library: labeled permits that show what PermitPike should find.
 * Each example is an EvalCase from /evals/cases. The card says what it is and the
 * expected outcome. The detail leads with the checks, one line each saying pass or
 * fail and why; every field sits behind "All fields", marked by its check.
 */

const DECISION: Record<RecommendationDecision, { label: string; className: string; Icon: typeof Check }> = {
  approve: { label: "Approve", className: "border-positive bg-positive-tint text-positive", Icon: Check },
  approve_with_conditions: {
    label: "Approve with conditions",
    className: "border-warning bg-warning-tint text-warning",
    Icon: TriangleAlert,
  },
  return_for_fixes: { label: "Return for fixes", className: "border-critical bg-critical-tint text-critical", Icon: X },
};

const STATUS: Record<CheckStatus, { word: string; Icon: typeof Check; tile: string; text: string; row: string }> = {
  fail: { word: "Fails", Icon: X, tile: "border-critical bg-critical text-surface", text: "text-critical", row: "bg-critical-tint" },
  warn: { word: "Needs a look", Icon: TriangleAlert, tile: "border-warning bg-warning-tint text-warning", text: "text-warning", row: "bg-warning-tint" },
  pass: { word: "Passes", Icon: Check, tile: "border-positive bg-positive-tint text-positive", text: "text-positive", row: "" },
};

const ORDER: Record<CheckStatus, number> = { fail: 0, warn: 1, pass: 2 };

/** The outcome an example expects. Same shape as StatusChip; the icon carries the meaning too. */
export function DecisionChip({ decision, className }: { decision: RecommendationDecision; className?: string }) {
  const d = DECISION[decision];
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1.5 border px-2 text-sm font-semibold whitespace-nowrap",
        d.className,
        className,
      )}
    >
      <d.Icon aria-hidden className="size-3.5" strokeWidth={3} />
      <span className="sr-only">Expected outcome: </span>
      {d.label}
    </span>
  );
}

/** "heat_pump_panel.outdoor_setback" → "Outdoor setback", unless a title is given. */
export function ruleTitle(ruleId: string, titles?: Record<string, string>) {
  if (titles?.[ruleId]) return titles[ruleId]!;
  const name = ruleId.split(".").pop() ?? ruleId;
  return name.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function Findings({ example, titles }: { example: EvalCase; titles?: Record<string, string> }) {
  const failing = example.expectedFailingRuleIds;
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {failing.length === 0 ? (
        <li className="flex items-center gap-2 text-ink">
          <Check aria-hidden className="size-4 shrink-0 text-positive" strokeWidth={2.5} />
          Every check passes
        </li>
      ) : (
        failing.map((id) => (
          <li key={id} className="flex items-center gap-2 text-ink">
            <X aria-hidden className="size-4 shrink-0 text-critical" strokeWidth={2.5} />
            <span>
              <span className="sr-only">Fails: </span>
              {ruleTitle(id, titles)}
            </span>
          </li>
        ))
      )}
      {example.expectUtilityFlag && (
        <li className="flex items-center gap-2 text-ink">
          <Zap aria-hidden className="size-4 shrink-0 text-warning" strokeWidth={2.5} />
          Needs utility review
        </li>
      )}
    </ul>
  );
}

/** One example in the library list. */
export function ExampleCard({
  example,
  titles,
  href,
  className,
}: {
  example: EvalCase;
  /** Readable rule titles by rule id, from the rule packs. */
  titles?: Record<string, string>;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <DecisionChip decision={example.expectedDecision} className="self-start" />
      <div className="flex flex-col gap-0.5">
        <span className="text-base leading-snug font-semibold text-ink">{example.description}</span>
        <span className="text-sm text-muted">{JOB_TYPE_LABELS[example.fields.jobType]}</span>
      </div>
      <div className="mt-auto">
        <Findings example={example} titles={titles} />
      </div>
    </>
  );
  const classes = cx(
    "flex h-full flex-col gap-4 border border-border bg-surface p-5 text-left",
    href && "transition-[background-color,box-shadow] duration-100 ease-out hov:wash",
    className,
  );
  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <article className={classes}>{body}</article>
  );
}

/** Every check, failures first: a status tile, what was checked and why, and the verdict in words. */
export function CheckList({ checks, className }: { checks: CheckResult[]; className?: string }) {
  const sorted = [...checks].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  return (
    <ul className={cx("border-t border-ink", className)}>
      {sorted.map((c) => {
        const s = STATUS[c.status];
        return (
          <li
            key={c.ruleId}
            className={cx("grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 border-b border-border px-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]", s.row)}
          >
            <span aria-hidden className={cx("flex size-7 items-center justify-center border", s.tile)}>
              <s.Icon className="size-4" strokeWidth={2.75} />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-semibold text-ink">{c.title}</span>
              <span className="text-sm text-ink">{c.message}</span>
              {c.suggestedFix && (
                <span className="text-sm text-ink">
                  <span className="font-semibold">Fix: </span>
                  {c.suggestedFix}
                </span>
              )}
              <span className="text-sm text-muted">{c.citation}</span>
            </div>
            <span className={cx("sr-only text-sm font-semibold sm:not-sr-only sm:col-start-3 sm:pt-1", s.text)}>{s.word}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Fields as a filled-in form. Each field a check looked at shows that check's result. */
export function FieldSheet({
  groups,
  status = {},
  className,
}: {
  groups: FieldGroup[];
  /** Check result by field key (dot path). */
  status?: Record<string, CheckStatus>;
  className?: string;
}) {
  return (
    <div className={cx("grid gap-x-10 gap-y-6 lg:grid-cols-2", className)}>
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title} className="flex flex-col">
          <h4 className="border-b border-ink pb-1.5 text-sm font-semibold text-ink">{g.title}</h4>
          <dl>
            {g.rows.map((r) => {
              const st = status[r.key];
              const s = st && STATUS[st];
              return (
                <div
                  key={r.key}
                  className={cx(
                    "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border py-1.5",
                    st && st !== "pass" && cx("-mx-2 px-2", s!.row),
                  )}
                >
                  <dt className={cx("text-sm", st === "fail" ? "font-semibold text-critical" : "text-muted")}>
                    {r.label}
                  </dt>
                  <dd className="flex items-center justify-end gap-1.5 text-right text-sm">
                    {r.value === null ? (
                      <span className="text-muted">Not shown</span>
                    ) : (
                      <span className={cx("text-ink", st === "fail" && "font-semibold")}>{r.value}</span>
                    )}
                    {s && (
                      <>
                        <s.Icon aria-hidden className={cx("size-3.5", s.text)} strokeWidth={3} />
                        <span className="sr-only"> ({s.word.toLowerCase()})</span>
                      </>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
    </div>
  );
}

/** One example opened: the outcome, every check in plain words, then all fields on request. */
export function ExampleDetail({
  example,
  checks,
  groups,
  fieldChecks = {},
  className,
}: {
  example: EvalCase;
  /** The checks this example should produce. */
  checks: CheckResult[];
  groups: FieldGroup[];
  /** Which check reads each field: field key (dot path) → rule id. */
  fieldChecks?: Record<string, string>;
  className?: string;
}) {
  const byRule = new Map(checks.map((c) => [c.ruleId, c.status]));
  const status: Record<string, CheckStatus> = {};
  for (const [key, ruleId] of Object.entries(fieldChecks)) {
    const st = byRule.get(ruleId);
    if (st) status[key] = st;
  }
  const fieldCount = groups.reduce((n, g) => n + g.rows.length, 0);

  return (
    <article className={cx("flex flex-col gap-6 border border-border bg-surface p-card", className)}>
      <header className="flex flex-col gap-2">
        <DecisionChip decision={example.expectedDecision} className="self-start" />
        <h3 className="max-w-2xl text-lg leading-snug text-ink">{example.description}</h3>
        <p className="text-sm text-muted">
          {JOB_TYPE_LABELS[example.fields.jobType]}
          {example.expectUtilityFlag && " · Needs utility review"}
        </p>
      </header>

      <section aria-labelledby={`${example.id}-checks`} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h4 id={`${example.id}-checks`} className="font-semibold text-ink">
            Checks
          </h4>
          <CheckSummary checks={checks} size="sm" />
        </div>
        <CheckList checks={checks} />
      </section>

      <details className="group border-t border-border pt-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-ink [&::-webkit-details-marker]:hidden">
          <ChevronDown
            aria-hidden
            className="size-4 -rotate-90 transition-transform duration-150 group-open:rotate-0"
            strokeWidth={2.5}
          />
          All fields
          <span className="font-normal text-muted">{fieldCount}</span>
        </summary>
        <FieldSheet groups={groups} status={status} className="pt-5" />
      </details>
    </article>
  );
}
