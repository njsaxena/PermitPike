import { ExternalLink } from "lucide-react";
import type { JobType } from "@permitpike/contract";
import { Card } from "@/components/ui";
import { ELIGIBILITY_NOTE, programsFor } from "@/lib/programs";
import { cx } from "@/lib/cx";

/** Clean-energy programs for this kind of job. From the job type only, so it shows from filing on. */
export function ProgramsCard({ jobType, className }: { jobType: JobType; className?: string }) {
  return (
    <Card label="Programs while you wait" className={cx("max-w-2xl", className)}>
      <ul className="flex flex-col divide-y divide-border">
        {programsFor(jobType).map((p) => (
          <li key={p.url} className="flex flex-col gap-1 py-3 first:pt-0">
            <a href={p.url} target="_blank" rel="noreferrer" className="pp-link inline-flex items-center gap-1 self-start">
              {p.name}
              <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.75} />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <p className="text-sm text-ink">{p.line}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-border pt-3 text-sm text-muted">{ELIGIBILITY_NOTE}</p>
    </Card>
  );
}
