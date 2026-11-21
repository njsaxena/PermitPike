import { redirect } from "next/navigation";
import { archivePermitId } from "@/lib/archive";

export default async function ReviewerArchiveRedirect({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const { from } = await searchParams;
  redirect(`/archive?from=${encodeURIComponent(archivePermitId(from) ?? "review")}`);
}
