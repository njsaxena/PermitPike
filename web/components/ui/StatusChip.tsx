import { Check, Clock, X } from "lucide-react";
import type { ReactNode } from "react";
import type { ApplicationStatus } from "@permitpike/contract";
import { cx } from "@/lib/cx";

/**
 * "draft" and "expired" are UI-only states: a draft is not submitted yet, and an expired
 * permit is stored as "approved" with an expiresAt in the past (lib/expiry.ts).
 * Each status has its own mark shape, so they differ without relying on color:
 * empty, outlined, half, full, X, check, clock.
 */
export type StatusChipStatus = ApplicationStatus | "draft" | "expired";

const box = "flex size-2.5 items-center border";

const STATUS: Record<StatusChipStatus, { label: string; className: string; mark: ReactNode }> = {
  draft: {
    label: "Draft",
    className: "border-dashed border-border-strong bg-surface text-muted",
    mark: <span className={cx(box, "border-dashed border-border-strong")} />,
  },
  submitted: {
    label: "Submitted",
    className: "border-ink bg-surface text-ink",
    mark: <span className={cx(box, "border-ink")} />,
  },
  ai_review: {
    label: "In review",
    className: "border-ink bg-accent-tint text-ink",
    mark: (
      <span className={cx(box, "border-ink")}>
        <span className="h-full w-1/2 bg-ink" />
      </span>
    ),
  },
  awaiting_official: {
    label: "Awaiting official",
    className: "border-ink bg-accent text-ink",
    mark: <span className={cx(box, "border-ink bg-ink")} />,
  },
  returned: {
    label: "Returned",
    className: "border-critical bg-critical-tint text-critical",
    mark: <X className="size-3" strokeWidth={3} />,
  },
  approved: {
    label: "Approved",
    className: "border-positive bg-positive-tint text-positive",
    mark: <Check className="size-3" strokeWidth={3} />,
  },
  expired: {
    label: "Expired",
    className: "border-border-strong bg-sunken text-muted",
    mark: <Clock className="size-3" strokeWidth={2.5} />,
  },
};

export function StatusChip({
  status,
  className,
}: {
  status: StatusChipStatus;
  className?: string;
}) {
  const s = STATUS[status];
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1.5 border px-2 font-sans text-sm font-semibold whitespace-nowrap",
        s.className,
        className,
      )}
    >
      <span aria-hidden className="flex items-center">
        {s.mark}
      </span>
      {s.label}
    </span>
  );
}
