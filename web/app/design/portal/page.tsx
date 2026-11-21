import { PermitQueue } from "@/components/ui";
import { QueueWelcome } from "@/components/review/QueueWelcome";
import { toSummary } from "@/lib/summary";
import { DEMO_OFFICIAL } from "./demo-official";
import { loadPortalExamples } from "./library";

export const metadata = { title: "Permit queue · PermitPike portal" };

/** The reviewer's queue, filled with the example library. Each permit opens the full review. */
export default function PortalQueuePage() {
  const examples = loadPortalExamples();
  const slugById = new Map(examples.map((e) => [e.detail.application.id, e.slug]));
  const permits = examples.map((e) => toSummary(e.detail.application));
  return (
    <div className="flex flex-col gap-8">
      <QueueWelcome name={DEMO_OFFICIAL} waiting={permits.filter((p) => p.status === "awaiting_official").length} />
      <PermitQueue permits={permits} hrefFor={(p) => `/design/portal/${slugById.get(p.id)}`} />
    </div>
  );
}
