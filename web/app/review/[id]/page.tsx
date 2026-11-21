import { redirect } from "next/navigation";
import { ReviewDetail } from "@/components/review/ReviewDetail";
import { getReviewer } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const reviewer = await getReviewer();
  if (!reviewer) redirect("/review");
  const { id } = await params;
  return <ReviewDetail id={id} />;
}
