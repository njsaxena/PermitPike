import { StartPermit } from "@/components/apply/StartPermit";
import { exampleSummary } from "@/lib/example-filing";
import { loadPortalExamples } from "../../portal/library";

export const metadata = { title: "File a permit · PermitPike" };

export default function ApplicantStartPage() {
  return (
    <StartPermit
      examples={loadPortalExamples().map(exampleSummary)}
      ownHref={(job) => `/design/applicant/new/own-${job}`}
      exampleHref={(slug) => `/design/applicant/new/${slug}`}
    />
  );
}
