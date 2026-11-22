"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui";
import { copyText } from "@/lib/clipboard";
import { cx } from "@/lib/cx";
import { EVERSOURCE_CONTRACTOR_URL, STEP0_DISCLAIMER, STEP0_TITLE, type Step0Draft } from "@/lib/step0";

/*
 * The Eversource Step 0 draft as a small table with a Copy button and Eversource's
 * contractor page. Used by the official (under the utility flag), by the electrician on
 * their permit and on /track, and wherever an official attached a draft to a decision.
 */
export function Step0DraftCard({
  draft,
  heading: Heading = "h2",
  id = "step0-draft",
  compact = false,
}: {
  draft: Step0Draft;
  heading?: "h2" | "h3";
  id?: string;
  /** For a narrow side column: each value under its label. */
  compact?: boolean;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    setState((await copyText(draft.text)) ? "copied" : "failed");
    window.setTimeout(() => setState("idle"), 2500);
  }

  return (
    <section aria-labelledby={id} data-step0-draft className="flex flex-col border border-border bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-card py-3">
        <Heading id={id} className="text-lg text-ink">
          {STEP0_TITLE}
        </Heading>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void copy()}
          icon={
            state === "copied" ? (
              <Check aria-hidden className="size-4" strokeWidth={1.75} />
            ) : (
              <Copy aria-hidden className="size-4" strokeWidth={1.75} />
            )
          }
        >
          {state === "copied" ? "Copied" : "Copy draft"}
        </Button>
      </header>
      <div className="flex flex-col gap-4 p-card">
        <p className="max-w-prose text-sm text-ink">{STEP0_DISCLAIMER}</p>
        <dl className={cx("border-t border-border text-sm", !compact && "grid grid-cols-[minmax(0,auto)_minmax(0,1fr)]")}>
          {draft.fields.map((f, i) => (
            <div
              key={`${f.key}-${i}`}
              className={cx("border-b border-border py-2", compact ? "flex flex-col gap-0.5" : "col-span-2 grid grid-cols-subgrid")}
            >
              <dt className="pr-4 text-muted">{f.label}</dt>
              <dd className={f.key === "trackingCode" || f.key === "parcelId" || f.key === "licenseNumber" ? "font-mono text-ink" : "text-ink"}>
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
        <span role="status" className="sr-only">
          {state === "copied" ? "Draft copied" : state === "failed" ? "Could not copy the draft." : ""}
        </span>
        {state === "failed" && <p className="text-sm text-critical">Could not copy. Select the rows above instead.</p>}
        <a
          href={EVERSOURCE_CONTRACTOR_URL}
          target="_blank"
          rel="noreferrer"
          className="pp-link inline-flex items-center gap-1 self-start text-sm"
        >
          Eversource contractor page
          <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.75} />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </section>
  );
}
