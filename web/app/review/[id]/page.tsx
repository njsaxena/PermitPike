import { redirect } from "next/navigation";
import { GetApplicationResponse } from "@permitpike/contract";
import { Prefetched } from "@/components/data/Prefetched";
import { ReviewDetail } from "@/components/review/ReviewDetail";
import { prefetch } from "@/lib/server/prefetch";
import { getApplicationDetail } from "@/lib/server/repo";
import { getReviewer } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const reviewer = await getReviewer();
  if (!reviewer) redirect("/review");
  const { id } = await params;
  const detail = await prefetch(GetApplicationResponse, () => getApplicationDetail(id));
  return (
    <Prefetched entries={[{ key: ["application", id], data: detail }]}>
      <ReviewDetail id={id} />
    </Prefetched>
  );
}
