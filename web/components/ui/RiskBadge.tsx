import { cx } from "@/lib/cx";

export type RiskLevel = "low" | "med" | "high";

const RISK: Record<RiskLevel, { label: string; bars: number; text: string; fill: string }> = {
  low: { label: "Low", bars: 1, text: "text-positive", fill: "bg-positive" },
  med: { label: "Medium", bars: 2, text: "text-warning", fill: "bg-warning" },
  high: { label: "High", bars: 3, text: "text-critical", fill: "bg-critical" },
};

/** Risk level with a three-step meter, so the level never depends on color alone. */
export function RiskBadge({
  level,
  plain,
  className,
}: {
  level: RiskLevel;
  /** No box and sentence case ("High risk"), for permit panels and queue rows. */
  plain?: boolean;
  className?: string;
}) {
  const r = RISK[level];
  const meter = (
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
  );
  if (plain) {
    return (
      <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap font-sans text-sm", className)}>
        {meter}
        <span className={cx("font-semibold", r.text)}>{r.label} risk</span>
      </span>
    );
  }
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-2 whitespace-nowrap border border-border-strong bg-surface px-2",
        className,
      )}
    >
      {meter}
      <span className={cx("font-mono text-label font-semibold tracking-label uppercase", r.text)}>
        Risk {r.label}
      </span>
    </span>
  );
}
