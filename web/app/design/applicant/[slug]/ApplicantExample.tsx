import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ApplicationDetail } from "@permitpike/contract";
import { ApplicantPermitView } from "@/components/apply/ApplicantPermitView";
import { loadPortalExamples } from "../../portal/library";

/** One example permit as the electrician who filed it sees it. */
export function ApplicantExample({ slug, justFiled }: { slug: string; justFiled: boolean }) {
  const example = loadPortalExamples().find((e) => e.slug === slug);
  if (!example) notFound();
  return (
    <div className="flex flex-col gap-6">
      <Link href="/design/applicant" className="pp-link inline-flex items-center gap-1.5 self-start text-sm">
        <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
        Your permits
      </Link>
      <ApplicantPermitView
        detail={justFiled ? justChecked(example.detail) : example.detail}
        justFiled={justFiled}
        note="Example permit. Every person, company and document in it is fictional."
      />
    </div>
  );
}

/**
 * The example as it stands a few minutes after filing: its first submission, checked by
 * PermitPike and waiting for an official. No decision yet, whatever happened later.
 */
function justChecked(detail: ApplicationDetail): ApplicationDetail {
  const first = detail.versions[0];
  if (!first) return detail;
  return {
    application: {
      ...detail.application,
      status: "awaiting_official",
      decidedAt: null,
      version: first.version,
      files: first.files,
      extraction: first.extraction,
      recommendation: first.recommendation,
    },
    versions: [first],
    actions: [],
  };
}

export function exampleParams() {
  return loadPortalExamples().map((e) => ({ slug: e.slug }));
}
