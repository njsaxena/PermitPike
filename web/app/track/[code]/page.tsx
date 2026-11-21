import type { Metadata } from "next";
import { TrackStatus } from "@/components/track/TrackStatus";

export const metadata: Metadata = { title: "Permit status · PermitPike", robots: { index: false } };

export default async function TrackCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <TrackStatus code={decodeURIComponent(code)} />;
}
