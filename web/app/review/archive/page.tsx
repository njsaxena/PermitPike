import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ArchiveChat } from "@/components/review/ArchiveChat";
import { ARCHIVE_PORTAL_URL } from "@/lib/archive";
import { getReviewer } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const applicationId = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  if (!(await getReviewer())) redirect("/review");

  const { from } = await searchParams;
  const permitId = typeof from === "string" && applicationId.test(from) ? from : null;
  const returnHref = permitId ? `/review/${encodeURIComponent(permitId)}` : "/review";

  return (
    <div className="flex flex-col gap-5">
      <Link href={returnHref} className="pp-link inline-flex items-center gap-1.5 self-start text-sm">
        <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
        {permitId ? "Back to permit" : "Back to queue"}
      </Link>
      <div>
        <h1 className="text-title text-ink">Boston Archive Chat</h1>
        <p className="mt-1 max-w-prose text-muted">Find historical permit records and official documents to support your review.</p>
      </div>
      <ArchiveChat portalUrl={ARCHIVE_PORTAL_URL} />
    </div>
  );
}
