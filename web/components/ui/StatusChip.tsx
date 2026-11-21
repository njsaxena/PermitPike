import type { ApplicationStatus } from "@permitpike/contract";
import { cx } from "@/lib/cx";

/**
 * "draft" is a UI-only state (not yet submitted, so not in the contract).
 * Both review stages from the contract share the "in review" look.
 */
export type StatusChipStatus = ApplicationStatus | "draft";

const STATUS: Record<StatusChipStatus, { label: string; className: string; mark: string }> = {
  draft: {
    label: "Draft",
    className: "border-dashed border-border-strong bg-surface text-muted",
    mark: "border border-border-strong bg-transparent",
  },
  submitted: {
    label: "Submitted",
    className: "border-accent bg-surface text-accent",
    mark: "bg-accent",
  },
  ai_review: {
    label: "In review",
    className: "border-accent bg-accent-tint text-accent",
    mark: "bg-accent",
  },
  awaiting_official: {
    label: "Awaiting official",
    className: "border-accent bg-accent-tint text-accent",
    mark: "bg-accent",
  },
  returned: {
    label: "Returned",
    className: "border-critical bg-critical-tint text-critical",
    mark: "bg-critical",
  },
  approved: {
    label: "Approved",
    className: "border-positive bg-positive-tint text-positive",
    mark: "bg-positive",
  },
};

export function StatusChip({ status, className }: { status: StatusChipStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1.5 rounded-sm border px-2 text-sm font-semibold whitespace-nowrap",
        s.className,
        className,
      )}
    >
      <span aria-hidden className={cx("size-2", s.mark)} />
      <span>
        <span className="sr-only">Status: </span>
        {s.label}
      </span>
    </span>
  );
}
