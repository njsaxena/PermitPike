import {
  APPROVAL_VALID_DAYS,
  JOB_TYPE_LABELS,
  PublicTrackView,
  TRACK_STATUS_LABELS,
  type ApplicationDetail,
  type ApplicationStatus,
  type ReviewerAction,
  type TrackStatus,
  type TrackTimelineStep,
} from "@permitpike/contract";

/*
 * The public /track view of an application. This is the only place that decides what a
 * stranger holding the code may see, so it copies fields one by one and never spreads an
 * application, version or action. Everything the city's review produced (recommendation,
 * checks, confidence, load calc, closure risk, conditions, reviewer notes) stays out;
 * the one exception is the official's reason for returning it. Copy never mentions AI.
 * track.test.ts fails if any of those fields or their text reach the output.
 */

/** One answer for a malformed code and an unknown one, so codes can't be probed. */
export const TRACK_NOT_FOUND = "We couldn't find that code.";

const STATUS: Record<ApplicationStatus, TrackStatus> = {
  submitted: "received",
  // The applicant doesn't need to know who is looking yet: both are "in the queue".
  ai_review: "in_queue",
  awaiting_official: "in_queue",
  returned: "changes_requested",
  approved: "approved",
};

export const NEXT_STEPS: Record<TrackStatus, string[]> = {
  received: [
    "We're logging your documents. This usually takes less than a minute.",
    "Keep your tracking code. You can check this page any time.",
  ],
  in_queue: [
    "A building official will review your application. You don't need to do anything right now.",
    "If changes are needed, this page will show the official's reason.",
  ],
  changes_requested: [
    "Read the official's reason above.",
    "The electrician who filed the permit can upload corrected documents from the permit page.",
    "After you resubmit, your application goes back in the review queue.",
  ],
  approved: [
    "Schedule your inspection with Boston's Inspectional Services Department.",
    "Keep the permit at the job site until the work passes inspection.",
  ],
  expired: [
    `Approvals are valid for ${APPROVAL_VALID_DAYS} days, so this permit no longer covers the work.`,
    "The electrician can file a new permit for the same job.",
  ],
};

/** "December 21, 2026" in Boston time, for the validity line. */
const validUntil = (at: string) =>
  new Date(at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });

/** "210 Dorchester St" -> "Dorchester St". Drops house numbers like 12, 12A, 12-14 and 12½. */
export function streetNameOnly(street: string): string {
  const name = street.trim().replace(/^\d+[A-Za-z]?(?:\s*[-–/]\s*\d+[A-Za-z]?)?\s*½?\s+/, "");
  return name || "Boston";
}

/** The official's decision on a version, if any. Override counts as whichever way it went. */
function decisionOf(action: ReviewerAction): { kind: "approved" | "changes_requested"; reason: string | null } {
  if (action.type === "approve") return { kind: "approved", reason: null };
  if (action.type === "return") return { kind: "changes_requested", reason: action.reason };
  return action.finalDecision === "approved"
    ? { kind: "approved", reason: null }
    : { kind: "changes_requested", reason: action.reason };
}

const LABEL: Record<TrackTimelineStep["kind"], string> = {
  received: "Received",
  resubmitted: "Resubmitted",
  in_queue: "In the review queue",
  changes_requested: "Changes requested",
  approved: "Approved",
  decision: "Decision from a building official",
  expired: "Approval expired",
};

const step = (kind: TrackTimelineStep["kind"], at: string | null): TrackTimelineStep => ({
  kind,
  label: LABEL[kind],
  at,
});

export function buildTrackView(
  detail: ApplicationDetail,
  extra: { queuedAt: string | null; aheadInQueue: number; now?: number },
): PublicTrackView {
  const app = detail.application;
  const expired = app.expiresAt !== null && Date.parse(app.expiresAt) <= (extra.now ?? Date.now());
  const status: TrackStatus = expired ? "expired" : STATUS[app.status];

  // Every earlier round: filed or resubmitted, then the official's decision.
  const timeline: TrackTimelineStep[] = [];
  for (const v of detail.versions) {
    const current = v.version === app.version;
    timeline.push(step(v.version === 1 ? "received" : "resubmitted", v.submittedAt));
    if (current) break;
    const decided = detail.actions.filter((a) => a.version === v.version).at(-1);
    if (decided) timeline.push(step(decisionOf(decided).kind, decided.timestamp));
  }

  // The current round.
  const decided = detail.actions.filter((a) => a.version === app.version).at(-1);
  const decision = decided ? decisionOf(decided) : null;
  const queuedAt = status === "received" ? null : (extra.queuedAt ?? v0Submitted(detail));
  timeline.push(step("in_queue", queuedAt));
  timeline.push(decision && decided ? step(decision.kind, decided.timestamp) : step("decision", null));
  if (expired && app.expiresAt) timeline.push(step("expired", app.expiresAt));

  const open = status === "received" || status === "in_queue";
  return PublicTrackView.parse({
    code: app.trackingCode,
    jobTypeLabel: JOB_TYPE_LABELS[app.jobType],
    submittedAt: app.submittedAt,
    streetName: streetNameOnly(app.address.street),
    status,
    statusLabel: TRACK_STATUS_LABELS[status],
    returnReason: status === "changes_requested" ? (decision?.reason ?? null) : null,
    timeline,
    aheadInQueue: open ? extra.aheadInQueue : null,
    nextSteps:
      status === "approved" && app.expiresAt
        ? [...NEXT_STEPS.approved, `This approval is valid until ${validUntil(app.expiresAt)}.`]
        : NEXT_STEPS[status],
  });
}

/** When an older row has no queued time, it joined the queue when this version was filed. */
function v0Submitted(detail: ApplicationDetail): string {
  const app = detail.application;
  return detail.versions.find((v) => v.version === app.version)?.submittedAt ?? app.submittedAt;
}
