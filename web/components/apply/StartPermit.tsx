import Link from "next/link";
import { ArrowRight, BatteryCharging, Fan, FileText, PlugZap } from "lucide-react";
import { JOB_TYPE_LABELS, JobType } from "@permitpike/contract";
import { DOCUMENTS } from "@/lib/documents";
import type { ExampleSummary } from "@/lib/example-filing";

/*
 * The first screen of "File a permit": one of the example permits, filled in with its
 * documents, to see the whole thing work; or your own job (pick the kind, then the form).
 */

const JOB_ICON: Record<JobType, typeof Fan> = {
  heat_pump_panel: Fan,
  ev_charger: PlugZap,
  home_battery: BatteryCharging,
};

const CARD =
  "flex h-full flex-col gap-3 border border-border-strong bg-surface p-5 text-left transition-[border-color,box-shadow] duration-100 ease-out hov:border-ink hov:wash";

export function StartPermit({
  examples,
  ownHref,
  exampleHref,
}: {
  examples: ExampleSummary[];
  ownHref: (job: JobType) => string;
  exampleHref: (slug: string) => string;
}) {
  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-title text-ink">File a permit</h1>
        <p className="max-w-prose text-lg text-ink">
          Start from an example permit to see filing and review work end to end, or enter your own job.
        </p>
      </div>

      {examples.length > 0 && (
        <section aria-labelledby="from-example" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="from-example" className="text-lg text-ink">
              Start from an example
            </h2>
            <p className="max-w-prose text-sm text-muted">
              {examples.length} permits filled in with their documents. Every person, company and document is fictional.
            </p>
          </div>
          <ul className="grid gap-4 md:grid-cols-2">
            {examples.map((e) => (
              <li key={e.slug}>
                <Link href={exampleHref(e.slug)} className={CARD}>
                  <span className="text-sm text-muted">
                    {e.jobLabel}
                    {e.neighborhood ? ` · ${e.neighborhood}` : ""}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-lg text-ink">{e.title}</span>
                    <span className="font-semibold text-ink">{e.address}</span>
                  </span>
                  <span className="text-sm text-ink">{e.demonstrates}</span>
                  <ul className="flex flex-col gap-1 border-t border-border pt-3 text-sm text-muted">
                    {e.highlights.map((h) => (
                      <li key={h} className="flex gap-2">
                        <span aria-hidden className="mt-2 size-1 shrink-0 bg-ink" />
                        {h}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                      <FileText aria-hidden className="size-4" strokeWidth={1.75} />
                      {e.files.length} documents attached
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                      Use this example
                      <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="own-job" className="flex flex-col gap-4">
        <h2 id="own-job" className="text-lg text-ink">
          Your own job
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {JobType.options.map((job) => {
            const Icon = JOB_ICON[job];
            const needed = DOCUMENTS[job].filter((d) => d.required).length;
            return (
              <li key={job}>
                <Link href={ownHref(job)} className={CARD} data-own-job={job}>
                  <Icon aria-hidden className="size-6 text-ink" strokeWidth={1.75} />
                  <span className="text-lg font-semibold text-ink">{JOB_TYPE_LABELS[job]}</span>
                  <span className="text-sm text-muted">{needed} documents to attach</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-1 font-semibold text-ink">
                    Start
                    <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

    </div>
  );
}
