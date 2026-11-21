"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Map as MapIcon } from "lucide-react";
import { Button, EmptyState, PermitQueue, PermitsMap } from "@/components/ui";
import { api, ApiRequestError, POLL_MS } from "@/lib/api-client";
import { toSummary } from "@/lib/summary";
import { QueueWelcome } from "./QueueWelcome";

/** The shared queue. Polls every 3 seconds; counts permits that arrived since the page opened. */
export function ReviewQueue({ reviewerName }: { reviewerName: string }) {
  const router = useRouter();
  const { data, error } = useSWR("review-queue", () => api.listApplications(), { refreshInterval: POLL_MS });
  const seen = useRef<Set<string> | null>(null);
  const [, rerender] = useState(0);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (error instanceof ApiRequestError && error.code === "unauthorized") router.refresh();
  }, [error, router]);

  if (data && seen.current === null) seen.current = new Set(data.applications.map((a) => a.id));
  const newCount = data ? data.applications.filter((a) => !seen.current?.has(a.id)).length : 0;

  function markSeen() {
    if (data) seen.current = new Set(data.applications.map((a) => a.id));
    rerender((n) => n + 1);
  }

  return (
    <div className="flex flex-col gap-8">
      <QueueWelcome
        name={reviewerName}
        waiting={data ? data.applications.filter((a) => a.status === "awaiting_official").length : 0}
      >
        <span role="status" aria-live="polite" className="flex items-center gap-2">
          {newCount > 0 && (
            <>
              {/* Plain text: dome gold is for actions and the current step, not badges. */}
              <span className="text-sm font-semibold text-ink">{newCount} new since you opened this</span>
              <Button variant="quiet" size="sm" onClick={markSeen}>
                Mark as seen
              </Button>
            </>
          )}
        </span>
      </QueueWelcome>
      {error && !data && <p className="text-critical">Could not load the queue. Retrying.</p>}
      {data && data.applications.length === 0 && (
        <EmptyState drawing="gas-lamp" message="No permits have been filed yet." />
      )}
      {data && data.applications.length > 0 && (
        <div className="flex flex-col gap-4">
          <div>
            <Button
              variant="secondary"
              size="sm"
              icon={<MapIcon className="size-4" strokeWidth={1.75} aria-hidden />}
              aria-pressed={showMap}
              aria-controls="queue-map"
              onClick={() => setShowMap((v) => !v)}
            >
              {showMap ? "Hide map" : "Show map"}
            </Button>
          </div>
          {showMap && (
            <div id="queue-map">
              <PermitsMap permits={data.applications} hrefFor={(a) => `/review/${a.id}`} />
            </div>
          )}
        </div>
      )}
      {data && data.applications.length > 0 && (
        <PermitQueue permits={data.applications.map(toSummary)} hrefFor={(p) => `/review/${p.id}`} />
      )}
    </div>
  );
}
