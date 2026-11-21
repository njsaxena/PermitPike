import type { ApplicationDetail } from "@permitpike/contract";
import { TRAIL_PROGRESS, TRAIL_STOPS, type TrailStep } from "@/components/ui";
import { stamp } from "./format";

/** The five trail stops for an application, from its status. */
export function trailSteps({ application: app }: ApplicationDetail): TrailStep[] {
  const states = TRAIL_PROGRESS[app.status].stops;
  const utilityNeeded = app.recommendation?.utilityFlag != null;
  return TRAIL_STOPS.map((stop, i) => {
    let state = states[i] ?? "upcoming";
    let note: string | undefined;
    if (stop.id === "utility" && state === "done" && !utilityNeeded) {
      state = "skipped";
      note = "Not required";
    }
    const timestamp =
      stop.id === "filed"
        ? stamp(app.submittedAt)
        : stop.id === "signed" && app.status === "approved" && app.decidedAt
          ? stamp(app.decidedAt)
          : undefined;
    return { id: stop.id, label: stop.label, state, ...(note ? { note } : {}), ...(timestamp ? { timestamp } : {}) };
  });
}
