import { GetApplicationResponse } from "@permitpike/contract";
import { Prefetched } from "@/components/data/Prefetched";
import { ApplicantStatus } from "@/components/apply/ApplicantStatus";
import { prefetch } from "@/lib/server/prefetch";
import { getApplicationDetail } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

export default async function ApplicantStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filed?: string }>;
}) {
  const [{ id }, { filed }] = await Promise.all([params, searchParams]);
  // Same data GET /api/applications/:id returns, loaded with the page.
  const detail = await prefetch(GetApplicationResponse, () => getApplicationDetail(id));
  return (
    <Prefetched entries={[{ key: ["application", id], data: detail }]}>
      <ApplicantStatus id={id} justFiled={filed === "1"} />
    </Prefetched>
  );
}
