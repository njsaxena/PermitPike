import { cx } from "@/lib/cx";

export type RiskLevel = "low" | "med" | "high";

const RISK: Record<RiskLevel, { label: string; bars: number; text: string; fill: string }> = {
  low: { label: "Low", bars: 1, text: "text-positive", fill: "bg-positive" },
  med: { label: "Medium", bars: 2, text: "text-warning", fill: "bg-warning" },
  high: { label: "High", bars: 3, text: "text-critical", fill: "bg-critical" },
};

/** Risk level with a three-step meter, so the level never depends on color alone. */
export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const r = RISK[level];
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-2 rounded-sm border border-border-strong bg-surface px-2",
        className,
      )}
    >
      <span aria-hidden className="flex items-end gap-0.5">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cx(
              "w-1",
              n === 1 ? "h-1.5" : n === 2 ? "h-2.5" : "h-3.5",
              n <= r.bars ? r.fill : "bg-border",
            )}
          />
        ))}
      </span>
      <span className={cx("font-mono text-label font-semibold tracking-label uppercase", r.text)}>
        Risk {r.label}
      </span>
    </span>
  );
}
