import { EvalDashboard } from "@/components/review/EvalDashboard";
import { ReviewerEntry } from "@/components/review/ReviewerEntry";
import { getReviewer } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** Eval results for staff. Same passcode check as the queue. */
export default async function EvalsPage() {
  const reviewer = await getReviewer();
  return reviewer ? <EvalDashboard /> : <ReviewerEntry />;
}
