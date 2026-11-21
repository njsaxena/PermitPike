import { ListApplicationsResponse } from "@permitpike/contract";
import { ApplyHome } from "@/components/apply/ApplyHome";
import { Prefetched } from "@/components/data/Prefetched";
import { getApplicantCookie } from "@/lib/server/applicant-cookie";
import { prefetch } from "@/lib/server/prefetch";
import { listApplications } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  // The cookie mirrors the id in localStorage; MyPermits keys on that id, so a mismatch just fetches.
  const applicantId = await getApplicantCookie();
  const mine = applicantId
    ? await prefetch(ListApplicationsResponse, async () => ({ applications: await listApplications({ applicantId }) }))
    : undefined;
  return (
    <Prefetched entries={applicantId ? [{ key: ["my-permits", applicantId], data: mine }] : []}>
      <ApplyHome />
    </Prefetched>
  );
}
