import { useId } from "react";
import { Check, CornerDownLeft, ListChecks } from "lucide-react";
import type { Confidence, RecommendationDecision } from "@permitpike/contract";
import { cx } from "@/lib/cx";

/*
 * The AI's advisory output. It never decides; an official does. So the heading
 * always says "PermitPike recommends …", the text stays ink (never a verdict color), and
 * the tone only shows in the header band and its icon tile.
 */
const DECISION: Record<
  RecommendationDecision,
  { label: string; Icon: typeof Check; band: string; tile: string }
> = {
  approve: {
    label: "PermitPike recommends approval",
    Icon: Check,
    band: "bg-positive-tint",
    tile: "border-positive bg-surface text-positive",
  },
  approve_with_conditions: {
    label: "PermitPike recommends approval with conditions",
    Icon: ListChecks,
    band: "bg-warning-tint",
    tile: "border-warning bg-surface text-warning",
  },
  return_for_fixes: {
    label: "PermitPike recommends returning for fixes",
    Icon: CornerDownLeft,
    band: "bg-critical-tint",
    tile: "border-critical bg-surface text-critical",
  },
};

export interface RecommendationCardProps {
  decision: RecommendationDecision;
  confidence: Confidence;
  summary: string;
  /** Conditions to attach if the official approves with conditions. */
  conditions?: string[];
  /** Mono line in the footer, e.g. model and timestamp. */
  meta?: string;
  className?: string;
}

export function RecommendationCard({
  decision,
  confidence,
  summary,
  conditions,
  meta,
  className,
}: RecommendationCardProps) {
  const d = DECISION[decision];
  const labelId = useId();
  const pct = Math.round(Math.min(1, Math.max(0, confidence)) * 100);
  return (
    <section aria-label="PermitPike recommendation" className={cx("border border-ink bg-surface", className)}>
      {/* No eyebrow: the recommendation itself is the heading (see DESIGN.md). */}
      <div className={cx("flex items-start gap-3 border-b border-ink px-card py-4", d.band)}>
        <span aria-hidden className={cx("flex size-9 shrink-0 items-center justify-center border", d.tile)}>
          <d.Icon className="size-5" strokeWidth={2.25} />
        </span>
        <h3 className="min-w-0 flex-1 pt-1 text-lg text-ink">{d.label}</h3>
        <span className="mt-1 shrink-0 border border-ink bg-surface px-1.5 font-mono text-label text-ink uppercase">
          Advisory
        </span>
      </div>

      <div className="flex flex-col gap-5 p-card">
        <div data-motion="meter">
          <div className="flex items-baseline justify-between text-sm">
            <span id={labelId} className="font-semibold text-ink">
              Confidence
            </span>
            <span className="font-mono text-ink">{pct}%</span>
          </div>
          <div
            role="meter"
            aria-labelledby={labelId}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-valuetext={`${pct} percent`}
            className="relative mt-1.5 h-2.5 border border-ink bg-surface"
          >
            <div data-meter-fill className="h-full bg-ink" style={{ width: `${pct}%` }} />
            {[25, 50, 75].map((t) => (
              <span
                key={t}
                aria-hidden
                className="absolute top-0 h-full w-px bg-border-strong mix-blend-difference"
                style={{ left: `${t}%` }}
              />
            ))}
          </div>
        </div>

        <p className="max-w-prose text-ink">{summary}</p>

        {conditions && conditions.length > 0 && (
          <div>
            <h4 className="font-semibold text-ink">Conditions</h4>
            <ol className="mt-2 flex flex-col gap-2">
              {conditions.map((c, i) => (
                <li key={c} className="grid grid-cols-[24px_1fr] gap-3 text-ink">
                  <span
                    aria-hidden
                    className="flex size-6 items-center justify-center border border-ink font-mono text-label"
                  >
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{c}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {meta && (
        <p className="border-t border-border px-card py-3 font-mono text-label text-muted">{meta}</p>
      )}
    </section>
  );
}
