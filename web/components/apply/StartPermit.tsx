import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JOB_TYPE_LABELS, JobType } from "@permitpike/contract";
import { DOCUMENTS } from "@/lib/documents";
import type { ExampleSummary } from "@/lib/example-filing";
import { JOB_ICON } from "@/components/permit/jobIcon";
import { ExamplePermits } from "./ExamplePermits";

/*
 * The first screen of "File a permit": the three kinds of job, then example permits to
 * start from, in their own panel below. Either way the permit is filed for real.
 */

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
    <div className="flex flex-col gap-10">
      <section aria-labelledby="file-a-permit" className="flex flex-col gap-5">
        <h1 id="file-a-permit" className="text-title text-ink">
          File a permit
        </h1>
        <ul className="grid gap-4 sm:grid-cols-3">
          {JobType.options.map((job) => {
            const Icon = JOB_ICON[job];
            const needed = DOCUMENTS[job].filter((d) => d.required).length;
            return (
              <li key={job}>
                <Link
                  href={ownHref(job)}
                  className="flex h-full flex-col gap-3 border border-border-strong bg-surface p-5 text-left transition-[border-color,box-shadow] duration-100 ease-out hov:border-ink hov:wash"
                >
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

      <ExamplePermits examples={examples.map((e) => ({ ...e, href: exampleHref(e.slug) }))} />
    </div>
  );
}
