import { ReviewerEntry } from "@/components/review/ReviewerEntry";
import { ReviewQueue } from "@/components/review/ReviewQueue";
import { getReviewer } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const reviewer = await getReviewer();
  return reviewer ? <ReviewQueue /> : <ReviewerEntry />;
}
