import type { Metadata } from "next";
import { TrackLookup } from "@/components/track/TrackLookup";

export const metadata: Metadata = { title: "Track a permit · PermitPike" };

/** Public: anyone with a tracking code. No login. */
export default function TrackPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title text-ink">Track a permit</h1>
      <TrackLookup />
    </div>
  );
}
