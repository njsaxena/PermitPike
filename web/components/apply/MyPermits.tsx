"use client";

import useSWR from "swr";
import { Plus } from "lucide-react";
import { ButtonLink, EmptyState, PermitCard } from "@/components/ui";
import { api, POLL_MS } from "@/lib/api-client";
import { toSummary } from "@/lib/summary";

export function MyPermits({ applicantId }: { applicantId: string }) {
  const { data, error } = useSWR(["my-permits", applicantId], () => api.listApplications({ applicantId }), {
    refreshInterval: POLL_MS,
  });
  const fileButton = (
    <ButtonLink href="/apply/new" icon={<Plus aria-hidden className="size-4" strokeWidth={1.75} />}>
      File a permit
    </ButtonLink>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-title text-ink">Your permits</h1>
        {data && data.applications.length > 0 && fileButton}
      </div>
      {error && !data && <p className="text-critical">Could not load your permits. Retrying.</p>}
      {data && data.applications.length === 0 && (
        <EmptyState drawing="triple-decker" message="You have not filed a permit yet." action={fileButton} />
      )}
      {data && data.applications.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.applications.map((app) => (
            <li key={app.id}>
              {/* Risk is for the city's reviewers, not the electrician. */}
              <PermitCard permit={{ ...toSummary(app), risk: null, closureRisk: null }} href={`/apply/${app.id}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
