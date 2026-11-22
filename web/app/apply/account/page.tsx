import type { Metadata } from "next";
import { GetApplicantResponse } from "@permitpike/contract";
import { ApplicantAccount } from "@/components/apply/ApplicantAccount";
import { Prefetched } from "@/components/data/Prefetched";
import { getApplicantCookie } from "@/lib/server/applicant-cookie";
import { prefetch } from "@/lib/server/prefetch";
import { getApplicant } from "@/lib/server/repo";

export const metadata: Metadata = { title: "Your account · PermitPike" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const applicantId = await getApplicantCookie();
  const account = applicantId
    ? await prefetch(GetApplicantResponse, async () => {
        const applicant = await getApplicant(applicantId);
        return applicant ? { applicant } : null;
      })
    : undefined;
  return (
    <Prefetched entries={applicantId ? [{ key: ["applicant", applicantId], data: account }] : []}>
      <ApplicantAccount />
    </Prefetched>
  );
}
