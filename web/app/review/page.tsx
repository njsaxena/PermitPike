import { ListApplicationsResponse } from "@permitpike/contract";
import { Prefetched } from "@/components/data/Prefetched";
import { ReviewerEntry } from "@/components/review/ReviewerEntry";
import { ReviewQueue } from "@/components/review/ReviewQueue";
import { prefetch } from "@/lib/server/prefetch";
import { listApplications } from "@/lib/server/repo";
import { getReviewer } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const reviewer = await getReviewer();
  if (!reviewer) return <ReviewerEntry />;
  // The queue arrives with the page, so the welcome line shows the real count straight away.
  const queue = await prefetch(ListApplicationsResponse, async () => ({ applications: await listApplications({}) }));
  return (
    <Prefetched entries={[{ key: "review-queue", data: queue }]}>
      <ReviewQueue reviewerName={reviewer.name} />
    </Prefetched>
  );
}
