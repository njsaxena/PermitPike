import { Check, TriangleAlert, UserCheck, X } from "lucide-react";
import type { CheckResult, CheckStatus } from "@permitpike/contract";
import { cx } from "@/lib/cx";
import { CitationChip } from "./CitationChip";

const STATUS: Record<
  CheckStatus,
  { label: string; Icon: typeof Check; icon: string; fix: string }
> = {
  pass: { label: "Pass", Icon: Check, icon: "border-positive bg-positive-tint text-positive", fix: "" },
  fail: {
    label: "Fail",
    Icon: X,
    icon: "border-critical bg-critical-tint text-critical",
    fix: "border-critical bg-critical-tint",
  },
  warn: {
    label: "Warning",
    Icon: TriangleAlert,
    icon: "border-warning bg-warning-tint text-warning",
    fix: "border-warning bg-warning-tint",
  },
};

export type CheckRowProps = Pick<
  CheckResult,
  "title" | "status" | "citation" | "message" | "suggestedFix"
> & {
  /** A building official overrode this check. The original result stays visible. */
  overridden?: { by: string; reason: string };
  className?: string;
};

/** One rule check. Renders as an <li>; place inside a <ul> or <ol>. */
export function CheckRow({
  title,
  status,
  citation,
  message,
  suggestedFix,
  overridden,
  className,
}: CheckRowProps) {
  const s = STATUS[status];
  return (
    <li
      className={cx(
        "grid grid-cols-[32px_minmax(0,1fr)] gap-x-4 gap-y-1 border-b border-border py-4 last:border-b-0",
        className,
      )}
    >
      <span className={cx("row-span-4 flex size-8 items-center justify-center border", s.icon)}>
        <s.Icon aria-hidden className="size-4" strokeWidth={2.25} />
        <span className="sr-only">{s.label}:</span>
      </span>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="font-semibold text-ink">{title}</span>
        <CitationChip citation={citation} />
      </div>
      <p className={cx("max-w-prose", status === "pass" ? "text-muted" : "text-ink")}>{message}</p>
      {suggestedFix && status !== "pass" && (
        <p className={cx("mt-2 max-w-prose border px-3 py-2 text-ink", s.fix)}>
          <span className="pp-label mr-2">Fix</span>
          {suggestedFix}
        </p>
      )}
      {overridden && (
        <p className="mt-2 flex max-w-prose items-start gap-2 border border-ink bg-surface px-3 py-2 text-ink">
          <UserCheck aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
          <span>
            <span className="font-semibold">Overridden by {overridden.by}.</span> {overridden.reason}
          </span>
        </p>
      )}
    </li>
  );
}

/** Placeholder row while a check is still running. Place inside the same list. */
export function CheckRowRunning({ title, className }: { title: string; className?: string }) {
  return (
    <li
      aria-busy="true"
      className={cx(
        "grid grid-cols-[32px_minmax(0,1fr)] items-center gap-x-4 border-b border-border py-4 last:border-b-0",
        className,
      )}
    >
      <span className="flex size-8 items-center justify-center border border-dashed border-border-strong">
        <span aria-hidden data-running className="size-2 bg-ink" />
      </span>
      <span className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-semibold text-ink">{title}</span>
        <span className="text-sm text-muted">Checking…</span>
      </span>
    </li>
  );
}

const SUMMARY_ORDER: { status: CheckStatus; one: string; many: string; short: [string, string] }[] = [
  { status: "fail", one: "failing check", many: "failing checks", short: ["failing", "failing"] },
  { status: "warn", one: "warning", many: "warnings", short: ["warning", "warnings"] },
  { status: "pass", one: "passing check", many: "passing checks", short: ["passed", "passed"] },
];

/**
 * Check counts at a glance: the status icon beside a large count, failures first.
 * Pass either `counts` or the `checks` themselves. Statuses with zero are still shown
 * (a zero next to the X is good news worth seeing), but dimmed.
 */
export function CheckSummary({
  counts,
  checks,
  size = "md",
  variant = "tiles",
  className,
}: {
  counts?: Partial<Record<CheckStatus, number>>;
  checks?: Pick<CheckResult, "status">[];
  /** sm for compact tiles. */
  size?: "sm" | "md";
  /**
   * tiles: icon tile beside a big count, zeros dimmed (check lists, review header).
   * inline: unboxed icon, count and word, zeros left out (permit panels, queue rows).
   */
  variant?: "tiles" | "inline";
  className?: string;
}) {
  const sm = size === "sm";
  const n: Record<CheckStatus, number> = { fail: 0, warn: 0, pass: 0 };
  if (checks) for (const c of checks) n[c.status] += 1;
  else Object.assign(n, counts);

  if (variant === "inline") {
    return (
      <ul className={cx("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
        {SUMMARY_ORDER.filter(({ status }) => n[status] > 0).map(({ status, short }) => {
          const s = STATUS[status];
          const count = n[status];
          return (
            <li key={status} className="flex items-center gap-1.5 whitespace-nowrap">
              <s.Icon aria-hidden className={cx("size-4", s.icon.split(" ")[2])} strokeWidth={2.5} />
              <span className="font-bold text-ink tabular-nums">{count}</span>
              <span className="text-sm text-muted">{short[count === 1 ? 0 : 1]}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className={cx("flex flex-wrap items-center", sm ? "gap-1.5" : "gap-2", className)}>
      {SUMMARY_ORDER.map(({ status, one, many }) => {
        const s = STATUS[status];
        const count = n[status];
        return (
          <li
            key={status}
            className={cx(
              "flex items-stretch border",
              sm ? "h-7" : "h-9",
              count === 0 ? "border-border opacity-60" : s.icon.split(" ")[0],
            )}
          >
            <span
              aria-hidden
              className={cx("flex items-center justify-center border-r", sm ? "w-7" : "w-9", s.icon)}
            >
              <s.Icon className={sm ? "size-3.5" : "size-4.5"} strokeWidth={2.5} />
            </span>
            <span
              className={cx(
                "flex items-center justify-center bg-surface leading-none font-bold text-ink tabular-nums",
                sm ? "min-w-7 px-2 text-base" : "min-w-9 px-2.5 text-lg",
              )}
            >
              {count}
              <span className="sr-only"> {count === 1 ? one : many}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
