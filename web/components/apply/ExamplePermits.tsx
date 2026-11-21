"use client";

import { useRef } from "react";
import { ArrowRight, BatteryCharging, ExternalLink, Fan, FileText, PlugZap, X } from "lucide-react";
import type { JobType } from "@permitpike/contract";
import { Button, ButtonLink, Tabs } from "@/components/ui";
import type { ExampleSummary } from "@/lib/example-filing";

/*
 * Example permits to start from, below "Your own job" on the first screen of "File a
 * permit". Each shows only the request and its documents: what happens to it is found
 * out by filing it. A card opens its documents to look through before starting.
 * The dialogs are always in the markup (data-dialog-open / data-dialog-close) so the
 * static copy on the design artifact opens them without React.
 */

const JOB_ICON: Record<JobType, typeof Fan> = {
  heat_pump_panel: Fan,
  ev_charger: PlugZap,
  home_battery: BatteryCharging,
};

export function ExamplePermits({ examples }: { examples: (ExampleSummary & { href: string })[] }) {
  if (examples.length === 0) return null;
  return (
    <section aria-labelledby="examples" className="flex flex-col gap-4 border border-border bg-sunken p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id="examples" className="text-lg text-ink">
          Example permits to start from
        </h2>
        <p className="text-sm text-muted">Every person, company and document in them is fictional.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {examples.map((e) => (
          <li key={e.slug}>
            <ExampleCard example={e} href={e.href} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExampleCard({ example: e, href }: { example: ExampleSummary; href: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = `example-${e.slug}`;
  const Icon = JOB_ICON[e.jobType];
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        data-dialog-open={id}
        aria-haspopup="dialog"
        className="flex h-full w-full items-start gap-3 border border-border-strong bg-surface p-3 text-left transition-[border-color,box-shadow] duration-100 ease-out hov:border-ink hov:wash"
      >
        <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-ink" strokeWidth={1.75} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold text-ink">{e.request}</span>
          <span className="text-sm text-muted">
            {e.neighborhood ? `${e.neighborhood} · ` : ""}
            {e.documents.length} documents
          </span>
        </span>
      </button>

      <dialog
        ref={dialog}
        id={id}
        aria-labelledby={`${id}-title`}
        className="m-auto w-full max-w-3xl border border-ink bg-surface p-0 text-ink"
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink bg-accent px-card py-4">
          <div className="flex flex-col gap-0.5">
            <h2 id={`${id}-title`} className="text-lg text-ink">
              {e.request}
            </h2>
            {e.neighborhood && <p className="text-sm text-ink">{e.neighborhood}</p>}
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            data-dialog-close=""
            className="-mr-2 flex size-8 items-center justify-center text-ink hov:bg-hover"
          >
            <X aria-hidden className="size-5" strokeWidth={2} />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="p-card">
          <Tabs
            label={`Documents for ${e.request}`}
            panelClassName="pt-4"
            items={e.documents.map((d) => ({
              id: `${e.slug}-${d.kind}-${d.name}`,
              label: d.title,
              content: (
                <figure className="flex flex-col gap-2">
                  <div className="flex h-[min(60vh,32rem)] items-center justify-center overflow-auto border border-border bg-sunken">
                    {/* eslint-disable-next-line @next/next/no-img-element -- static example files */}
                    <img src={d.preview} alt={d.title} loading="lazy" className="max-h-full max-w-full object-contain" />
                  </div>
                  <figcaption className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <FileText aria-hidden className="size-4" strokeWidth={1.75} />
                      {d.name}
                    </span>
                    <a href={d.href} target="_blank" rel="noreferrer" className="pp-link inline-flex items-center gap-1">
                      Open original
                      <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.75} />
                    </a>
                  </figcaption>
                </figure>
              ),
            }))}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-border px-card py-4">
          <Button variant="secondary" onClick={() => dialog.current?.close()} data-dialog-close="">
            Close
          </Button>
          <ButtonLink href={href} icon={<ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />}>
            Start from this example
          </ButtonLink>
        </div>
      </dialog>
    </>
  );
}
