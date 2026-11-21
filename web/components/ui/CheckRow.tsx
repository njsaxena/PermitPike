import { Check, TriangleAlert, X } from "lucide-react";
import type { CheckResult, CheckStatus } from "@permitpike/contract";
import { cx } from "@/lib/cx";
import { CitationChip } from "./CitationChip";

const STATUS: Record<
  CheckStatus,
  { label: string; Icon: typeof Check; icon: string; fixBorder: string }
> = {
  pass: { label: "Pass", Icon: Check, icon: "border-positive bg-positive-tint text-positive", fixBorder: "" },
  fail: { label: "Fail", Icon: X, icon: "border-critical bg-critical-tint text-critical", fixBorder: "border-critical" },
  warn: { label: "Warning", Icon: TriangleAlert, icon: "border-warning bg-warning-tint text-warning", fixBorder: "border-warning" },
};

export type CheckRowProps = Pick<
  CheckResult,
  "title" | "status" | "citation" | "message" | "suggestedFix"
> & { className?: string };

/** One rule check. Renders as an <li>; place inside a <ul> or <ol>. */
export function CheckRow({ title, status, citation, message, suggestedFix, className }: CheckRowProps) {
  const s = STATUS[status];
  return (
    <li
      className={cx(
        "grid grid-cols-[32px_1fr] gap-x-4 gap-y-1 border-b border-border py-4 last:border-b-0",
        className,
      )}
    >
      <span
        className={cx(
          "row-span-3 flex size-8 items-center justify-center rounded-sm border",
          s.icon,
        )}
      >
        <s.Icon aria-hidden className="size-4" strokeWidth={2.25} />
        <span className="sr-only">{s.label}:</span>
      </span>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="font-semibold text-ink">{title}</span>
        <CitationChip citation={citation} />
      </div>
      <p className="text-muted">{message}</p>
      {suggestedFix && status !== "pass" && (
        <p className={cx("mt-2 border-l-2 pl-3 text-ink", s.fixBorder)}>
          <span className="pp-label mr-2 text-ink">Fix</span>
          {suggestedFix}
        </p>
      )}
    </li>
  );
}
