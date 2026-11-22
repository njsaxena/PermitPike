import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ArchiveChat } from "@/components/ArchiveChat";
import { ARCHIVE_PORTAL_URL, archivePermitId } from "@/lib/archive";

export const metadata = { title: "Boston Archive Chat | PermitPike" };

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const { from } = await searchParams;
  const permitId = archivePermitId(from);
  const returnHref = permitId ? `/review/${encodeURIComponent(permitId)}` : from === "review" ? "/review" : null;

  return (
    // One screen on wide windows: 100dvh less the header (65px) and main's padding (2 x 32px).
    // The min height lets a very short window scroll instead of crushing the chat.
    <div className="flex flex-col gap-5 lg:h-[calc(100dvh-129px)] lg:min-h-[32rem]">
      {returnHref && (
        <Link href={returnHref} className="pp-link inline-flex items-center gap-1.5 self-start text-sm">
          <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
          {permitId ? "Back to permit" : "Back to queue"}
        </Link>
      )}
      <div>
        <h1 className="text-title text-ink">Boston Archive Chat</h1>
        <p className="mt-1 max-w-prose text-muted">Search Boston’s public permit records and find official documents.</p>
      </div>
      <ArchiveChat portalUrl={ARCHIVE_PORTAL_URL} />
    </div>
  );
}
