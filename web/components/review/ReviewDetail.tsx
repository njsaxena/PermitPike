"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import type { ReviewerActionInput } from "@permitpike/contract";
import { Button, Callout } from "@/components/ui";
import { api, ApiRequestError, POLL_MS } from "@/lib/api-client";
import { buildStep0Draft } from "@/lib/step0";
import { ChangeStatus } from "./ChangeStatus";
import { ReviewWorkspace } from "./ReviewWorkspace";

const STALE = "This permit was updated, reload.";

/**
 * One permit for an official, from the API. The version shown is pinned when the page
 * loads; if the applicant resubmits meanwhile, the page says so and the server rejects
 * actions on the old version. Layout and evidence live in ReviewWorkspace.
 */
export function ReviewDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data, error, mutate } = useSWR(["application", id], () => api.getApplication(id), {
    refreshInterval: POLL_MS,
  });
  // Pinned on the first render when the server sent the permit with the page.
  const [pinned, setPinned] = useState<number | null>(data?.application.version ?? null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (data && pinned === null) setPinned(data.application.version);
  }, [data, pinned]);
  useEffect(() => {
    if (error instanceof ApiRequestError && error.code === "unauthorized") router.refresh();
  }, [error, router]);

  if (error && !data) {
    const missing = error instanceof ApiRequestError && error.code === "not_found";
    return <p className="text-critical">{missing ? "We can't find that permit." : "Could not load this permit. Retrying."}</p>;
  }
  if (!data || pinned === null) return null;

  const app = data.application;
  const isStale = stale || app.version !== pinned;
  const rec = data.versions.find((v) => v.version === pinned)?.recommendation ?? null;

  function reload() {
    setStale(false);
    setPinned(app.version);
    void mutate();
  }

  async function submit(action: ReviewerActionInput): Promise<string | null> {
    try {
      await api.reviewApplication(app.id, { expectedVersion: pinned!, action });
      void mutate();
      return null;
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "conflict") {
        setStale(true);
        return null;
      }
      if (err instanceof ApiRequestError && err.code === "unauthorized") {
        router.refresh();
        return null;
      }
      return err instanceof Error ? err.message : "Could not save. Try again.";
    }
  }

  return (
    <ReviewWorkspace
      // A new version starts a fresh permit record.
      key={pinned}
      detail={data}
      version={pinned}
      backHref="/review"
      archiveHref={`/review/archive?from=${encodeURIComponent(app.id)}`}
      notice={
        isStale && (
          <Callout tone="warning" title={STALE}>
            <Button variant="secondary" size="sm" className="mt-2" onClick={reload}>
              Reload
            </Button>
          </Callout>
        )
      }
      actions={
        app.status === "awaiting_official" && !isStale ? <ChangeStatus
            app={app}
            rec={rec}
            onSubmit={submit}
            // What the electrician gets: their permit's values, without the city's load calculation.
            step0={rec?.utilityFlag ? buildStep0Draft(app) : null}
          /> : undefined
      }
    />
  );
}
