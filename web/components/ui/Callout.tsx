import type { ReactNode } from "react";
import { Info, TriangleAlert, UtilityPole } from "lucide-react";
import { cx } from "@/lib/cx";

export type CalloutTone = "info" | "warning" | "utility";

/*
 * A full 1px box with a square icon tile on the left. No colored side stripe:
 * the tone lives in the tile and the fill.
 */
const TONE: Record<CalloutTone, { Icon: typeof Info; box: string; tile: string }> = {
  info: { Icon: Info, box: "border-ink bg-surface", tile: "border-ink bg-accent text-ink" },
  warning: {
    Icon: TriangleAlert,
    box: "border-warning bg-warning-tint",
    tile: "border-warning bg-surface text-warning",
  },
  // Utility flags (e.g. an Eversource service upgrade): an action outside the city.
  utility: { Icon: UtilityPole, box: "border-ink bg-surface", tile: "border-ink bg-ink text-surface" },
};

export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: CalloutTone;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <div role="note" className={cx("flex border", t.box, className)}>
      <span aria-hidden className={cx("flex w-11 shrink-0 justify-center border-r pt-4", t.tile)}>
        <t.Icon className="size-5" strokeWidth={1.75} />
      </span>
      <div className="flex flex-col gap-1 px-4 py-4">
        <p className="font-semibold text-ink">{title}</p>
        {children && <div className="max-w-prose text-ink">{children}</div>}
      </div>
    </div>
  );
}
