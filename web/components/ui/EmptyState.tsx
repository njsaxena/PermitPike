import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { BostonDrawing, type BostonDrawingKind } from "./BostonDrawing";

/** "Nothing here yet": a Boston drawing, one plain sentence, and at most one action. */
export function EmptyState({
  drawing,
  message,
  action,
  className,
}: {
  drawing: BostonDrawingKind;
  message: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "grid items-center gap-6 border border-border bg-surface p-card sm:grid-cols-[200px_minmax(0,1fr)]",
        className,
      )}
    >
      <BostonDrawing kind={drawing} className="max-w-[200px]" />
      <div className="flex flex-col items-start gap-4">
        <p className="text-lg font-semibold text-ink">{message}</p>
        {action}
      </div>
    </div>
  );
}
