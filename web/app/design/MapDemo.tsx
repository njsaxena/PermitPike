"use client";

import { PermitsMap } from "@/components/ui";
import { MOCK_APPLICATIONS } from "@/mocks/applications";

/** Queue map from the demo applications (cached parcels; no live city lookups here). */
export function QueueMapDemo() {
  return <PermitsMap permits={MOCK_APPLICATIONS.map((d) => d.application)} hrefFor={() => "#map"} />;
}
