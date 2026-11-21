import type { CSSProperties } from "react";
import { Check, X } from "lucide-react";
import { cx } from "@/lib/cx";
import { clockTime, longDate } from "@/lib/format";

/*
 * A permit "follows the trail" from filed to signed. Brick is only ever the path:
 * walked stretches are a solid brick-red line; the road ahead is a dashed granite line. Markers carry the state: ink for done, dome gold for where
 * the permit is now, brick X for returned.
 * Horizontal from `sm` up; a vertical trail on phones.
 */

export type TrailStepState = "done" | "current" | "returned" | "upcoming" | "skipped";

export interface TrailStep {
  id: string;
  label: string;
  state: TrailStepState;
  /** "2026-11-21 09:14" or ISO. Shown in words: "November 21st", then "9:14 AM". */
  timestamp?: string;
  /** Short status, e.g. "Not required" for a skipped utility step. */
  note?: string;
}

/** The standard five stops, for callers that only need to set states. */
export const TRAIL_STOPS = [
  { id: "filed", label: "Filed" },
  { id: "checked", label: "Checked" },
  { id: "utility", label: "Utility" },
  { id: "review", label: "Review" },
  { id: "signed", label: "Signed" },
] as const;

const STATE_TEXT: Record<TrailStepState, string> = {
  done: "Complete",
  current: "In progress",
  returned: "Returned for fixes",
  upcoming: "Not started",
  skipped: "Skipped",
};

function walked(state: TrailStepState | undefined) {
  return state === "done" || state === "skipped";
}

export function TrailTimeline({
  steps,
  label = "Permit progress",
  className,
}: {
  steps: TrailStep[];
  label?: string;
  className?: string;
}) {
  return (
    <ol
      aria-label={label}
      data-motion="trail"
      className={cx("grid grid-cols-1 sm:grid-cols-[repeat(var(--stops),minmax(0,1fr))]", className)}
      style={{ "--stops": steps.length } as CSSProperties}
    >
      {steps.map((step, i) => {
        const next = steps[i + 1];
        const brick = walked(step.state) && next !== undefined && next.state !== "upcoming";
        const order = { "--i": i } as CSSProperties;
        return (
          <li
            key={step.id}
            aria-current={step.state === "current" || step.state === "returned" ? "step" : undefined}
            className="relative grid grid-cols-[24px_1fr] gap-x-4 pb-6 last:pb-0 sm:block sm:pr-2 sm:pb-0"
          >
            {next && (
              <>
                {/* Horizontal segment (sm and up) */}
                <span
                  aria-hidden
                  data-trail-seg
                  style={order}
                  className={cx(
                    "absolute right-0 left-6 hidden sm:block",
                    "top-[11px]",
                    brick ? "h-0.5 bg-critical" : "border-t-2 border-dashed border-border-strong",
                  )}
                />
                {/* Vertical segment (phones) */}
                <span
                  aria-hidden
                  data-trail-seg="v"
                  style={order}
                  className={cx(
                    "absolute top-6 bottom-0 sm:hidden",
                    "left-[11px]",
                    brick ? "w-0.5 bg-critical" : "border-l-2 border-dashed border-border-strong",
                  )}
                />
              </>
            )}
            <Marker state={step.state} style={order} />
            <div className="flex flex-col pt-0.5 sm:mt-3 sm:pt-0">
              <span
                className={cx(
                  "text-sm font-semibold",
                  step.state === "upcoming" || step.state === "skipped" ? "text-muted" : "text-ink",
                  step.state === "returned" && "text-critical",
                )}
              >
                {step.label}
                <span className="sr-only">, {STATE_TEXT[step.state]}</span>
              </span>
              {step.timestamp && (
                <time dateTime={step.timestamp.replace(" ", "T")} className="flex flex-col text-sm">
                  <span className="whitespace-nowrap text-ink">{longDate(step.timestamp)}</span>
                  <span className="text-muted">{clockTime(step.timestamp)}</span>
                </time>
              )}
              {step.note && (
                <span
                  className={cx(
                    "text-sm",
                    step.state === "current" || step.state === "returned" ? "text-ink" : "text-muted",
                  )}
                >
                  {step.note}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Marker({ state, style }: { state: TrailStepState; style?: CSSProperties }) {
  return (
    <span
      aria-hidden
      data-trail-marker
      style={style}
      className={cx(
        "relative z-10 flex size-6 items-center justify-center",
        state === "done" && "border border-ink bg-ink text-surface",
        state === "current" && "border-2 border-ink bg-accent",
        state === "returned" && "border border-critical bg-critical text-surface",
        state === "upcoming" && "border border-border-strong bg-surface",
        state === "skipped" && "border border-dashed border-border-strong bg-background",
      )}
    >
      {state === "done" && <Check className="size-4" strokeWidth={2.5} />}
      {state === "current" && <span className="size-2 bg-ink" />}
      {state === "returned" && <X className="size-4" strokeWidth={2.5} />}
    </span>
  );
}
