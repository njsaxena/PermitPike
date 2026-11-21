"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, BatteryCharging, ExternalLink, Fan, FileText, MapPin, PlugZap, X } from "lucide-react";
import type { JobType, ParcelLookupResponse } from "@permitpike/contract";
import { Button, ButtonLink, Tabs } from "@/components/ui";
import { addressLine, assessorAddressText, MapUnavailable, PropertyMap } from "@/components/ui/PropertyMap";
import { api } from "@/lib/api-client";
import type { ExampleSummary } from "@/lib/example-filing";

/*
 * Example permits to start from, below "Your own job" on the first screen of "File a
 * permit". Each shows only the request and its documents: what happens to it is found
 * out by filing it. "Use this example" opens the filled-in form; "View details" shows where
 * the property is on the live parcel map, then each document, to look through first.
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
  // The map tab mounts only while the dialog is open: Leaflet can't size itself in a closed dialog.
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("map");
  function show() {
    setTab("map");
    setOpen(true);
    dialog.current?.showModal();
  }
  function hide() {
    dialog.current?.close();
  }
  return (
    <>
      <div className="flex h-full flex-col gap-3 border border-border-strong bg-surface p-3">
        <div className="flex items-start gap-3">
          <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-ink" strokeWidth={1.75} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="font-semibold text-ink">{e.request}</p>
            <p className="text-sm text-muted">
              {e.neighborhood ? `${e.neighborhood} · ` : ""}
              {e.documents.length} documents
            </p>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pl-8">
          <ButtonLink href={href} variant="secondary" size="sm" aria-label={`Use this example: ${e.request}`}>
            Use this example
          </ButtonLink>
          <Button
            variant="secondary"
            size="sm"
            onClick={show}
            data-dialog-open={id}
            aria-haspopup="dialog"
            aria-label={`View details: ${e.request}`}
          >
            View details
          </Button>
        </div>
      </div>

      <dialog
        ref={dialog}
        id={id}
        aria-labelledby={`${id}-title`}
        onClose={() => setOpen(false)}
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
            onClick={hide}
            data-dialog-close=""
            className="-mr-2 flex size-8 items-center justify-center text-ink hov:bg-hover"
          >
            <X aria-hidden className="size-5" strokeWidth={2} />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="p-card">
          <Tabs
            label={`Details for ${e.request}`}
            panelClassName="pt-4"
            value={tab}
            onChange={setTab}
            items={[
              {
                id: "map",
                label: "Location",
                icon: <MapPin aria-hidden className="size-4" strokeWidth={1.75} />,
                content: open && tab === "map" ? <ExampleLocation example={e} /> : <div className="h-[min(60vh,32rem)]" />,
              },
              ...e.documents.map((d) => ({
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
              })),
            ]}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-border px-card py-4">
          <Button variant="secondary" onClick={hide} data-dialog-close="">
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

type Lookup = { kind: "loading" } | { kind: "done"; res: ParcelLookupResponse };

/** The live parcel map for the example's address: the same lookup the filing form runs. */
function ExampleLocation({ example: e }: { example: ExampleSummary }) {
  const [state, setState] = useState<Lookup>({ kind: "loading" });
  const typed = addressLine(e.address);
  useEffect(() => {
    const controller = new AbortController();
    api
      .lookupParcel({ address: e.address.street, zip: e.address.zip }, controller.signal)
      .then((res) => setState({ kind: "done", res }))
      .catch(() => {
        // Closed before it answered.
      });
    return () => controller.abort();
  }, [e.address.street, e.address.zip]);

  const box = "h-[min(60vh,32rem)]";
  if (state.kind === "loading") {
    return (
      <div aria-busy className={`${box} flex items-center justify-center border border-border bg-sunken text-sm text-muted`}>
        Finding {typed}
      </div>
    );
  }
  const parcel = state.res.result === "found" ? state.res.parcel : null;
  if (!parcel) return <MapUnavailable address={typed} />;
  const label = parcel.assessorAddress ? assessorAddressText(parcel.assessorAddress) : typed;
  return (
    <figure className="flex flex-col gap-2">
      <PropertyMap parcel={parcel} address={label} className={box} />
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <MapPin aria-hidden className="size-4" strokeWidth={1.75} />
          {label}
        </span>
        <span className="font-mono">Parcel {parcel.parcelId}</span>
      </figcaption>
    </figure>
  );
}
