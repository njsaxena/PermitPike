"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { useId } from "react";
import type { Address, Application, ApplicationStatus, Parcel } from "@permitpike/contract";
import { cx } from "@/lib/cx";
import { StatusChip } from "./StatusChip";
import type { MapPin } from "./map/LeafletMaps";

/*
 * Property maps. Leaflet runs in the browser only, so the canvases load with
 * next/dynamic and ssr:false. Each map has a text summary for screen readers, and
 * when there is no parcel the address text stands in with "Map unavailable".
 */

const Placeholder = ({ className }: { className?: string }) => (
  <div aria-hidden className={cx("bg-sunken", className)} />
);
const ParcelMapCanvas = dynamic(() => import("./map/LeafletMaps").then((m) => m.ParcelMapCanvas), {
  ssr: false,
  loading: () => <Placeholder className="h-full w-full" />,
});
const PinsMapCanvas = dynamic(() => import("./map/LeafletMaps").then((m) => m.PinsMapCanvas), {
  ssr: false,
  loading: () => <Placeholder className="h-full w-full" />,
});

const KEEP_UPPER = new Set(["MA", "NE", "NW", "SE", "SW"]);

/** "28 BROOKSIDE AV, JAMAICA PLAIN MA 02130" -> "28 Brookside Av, Jamaica Plain MA 02130" */
export function assessorAddressText(raw: string): string {
  return raw
    .split(" ")
    .map((w) => (KEEP_UPPER.has(w) || /\d/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(" ");
}

export function addressLine(a: Address): string {
  return `${a.street}${a.unit ? `, Unit ${a.unit}` : ""}, Boston MA ${a.zip}`;
}

function districtText(d: Parcel["districts"][number]): string {
  return [d.subdistrict, d.district].filter(Boolean).join(", ");
}

/** One sentence a screen reader gets in place of the picture. */
export function parcelSummary(parcel: Parcel, address: string): string {
  const zones = parcel.districts.map(districtText).filter(Boolean);
  const overlays = parcel.overlays.map((o) => o.featureName ? `${o.name} (${o.featureName})` : o.name);
  return [
    `Map of ${address}, Boston parcel ${parcel.parcelId}, pinned${parcel.outline ? " with its boundary outlined" : ""}.`,
    zones.length ? `Zoning: ${zones.join("; ")}.` : "No zoning district returned.",
    overlays.length ? `Possible overlays: ${overlays.join("; ")}.` : "No overlays found.",
    "Use arrow keys to pan and plus or minus to zoom.",
  ].join(" ");
}

export function MapUnavailable({ address, className }: { address: string; className?: string }) {
  return (
    <div role="note" className={cx("flex items-start gap-3 border border-border bg-sunken p-4", className)}>
      <MapPinOff aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" strokeWidth={1.75} />
      <div className="flex flex-col gap-1">
        <p className="text-ink">{address}</p>
        <p className="text-sm text-muted">Map unavailable</p>
      </div>
    </div>
  );
}

/** Pin, parcel outline and summary. Height comes from className (default 256px). */
export function PropertyMap({
  parcel,
  address,
  className,
}: {
  parcel: Parcel | null;
  address: string;
  className?: string;
}) {
  const summaryId = useId();
  if (!parcel) return <MapUnavailable address={address} />;
  return (
    <div className={cx("relative isolate h-64 border border-border", className)}>
      <ParcelMapCanvas
        parcel={parcel}
        label={`Map of ${address}`}
        describedBy={summaryId}
        className="h-full w-full"
      />
      <p id={summaryId} className="sr-only">
        {parcelSummary(parcel, address)}
      </p>
    </div>
  );
}

const chip = "inline-flex min-h-6 items-center border px-2 py-0.5 text-sm";

/** Zoning district first (ink edge), then overlays (quiet). */
export function ZoningChips({ parcel, overlays = true }: { parcel: Parcel; overlays?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Zoning">
      {parcel.districts.map((d) => (
        <li key={districtText(d)} className={cx(chip, "border-ink bg-surface font-semibold text-ink")}>
          {d.subdistrict && <span className="font-mono">{d.subdistrict}</span>}
          {d.subdistrict && d.district && <span aria-hidden className="px-1.5 text-muted">·</span>}
          {d.district}
        </li>
      ))}
      {parcel.districts.length === 0 && (
        <li className={cx(chip, "border-border bg-sunken text-muted")}>No zoning district returned</li>
      )}
      {overlays &&
        parcel.overlays.map((o) => (
          <li key={`${o.name}|${o.featureName}`} className={cx(chip, "border-border bg-sunken text-ink")}>
            {o.featureName ? `${o.name}: ${o.featureName}` : o.name}
          </li>
        ))}
    </ul>
  );
}

/** Reviewer detail: map, parcel, zoning and overlays, and the dimensional table the setback check reads. */
export function PropertyCard({
  parcel,
  address,
  setbackCheck = false,
  className,
}: {
  parcel: Parcel | null;
  address: Address;
  /** The job has a setback check; name the dimensional table as its reference. */
  setbackCheck?: boolean;
  className?: string;
}) {
  const line = addressLine(address);
  const tables = parcel?.districts.find((d) => d.tablesUrl);
  return (
    <section aria-labelledby="property-card" className={cx("border border-border bg-surface", className)}>
      <header className="flex min-h-14 items-center border-b border-border px-card py-3">
        <h3 id="property-card" className="pp-label">
          Property
        </h3>
      </header>
      {parcel ? (
        <>
          <PropertyMap parcel={parcel} address={line} className="h-60 border-x-0 border-t-0" />
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-3 p-card text-sm">
            <dt className="text-muted">Parcel</dt>
            <dd className="font-mono text-ink">{parcel.parcelId}</dd>
            {parcel.assessorAddress && (
              <>
                <dt className="text-muted">Assessor</dt>
                <dd className="text-ink">{assessorAddressText(parcel.assessorAddress)}</dd>
              </>
            )}
            <dt className="self-center text-muted">Zoning</dt>
            <dd>
              <ZoningChips parcel={parcel} overlays={false} />
            </dd>
            <dt className="self-center text-muted">Overlays</dt>
            <dd>
              {parcel.overlays.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {parcel.overlays.map((o) => (
                    <li key={`${o.name}|${o.featureName}`} className={cx(chip, "border-border bg-sunken text-ink")}>
                      {o.featureName ? `${o.name}: ${o.featureName}` : o.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-ink">None found</span>
              )}
            </dd>
            {tables?.tablesUrl && (
              <>
                <dt className="text-muted">{setbackCheck ? "Setback table" : "Dimensions"}</dt>
                <dd>
                  <a href={tables.tablesUrl} target="_blank" rel="noreferrer" className="pp-link">
                    Article {tables.article} dimensional tables
                    <span className="sr-only"> (opens the Boston Zoning Code in a new tab)</span>
                  </a>
                </dd>
              </>
            )}
            {parcel.match !== "matched" && (
              <p className="col-span-2 text-warning">
                {parcel.match === "multiple_zones"
                  ? "This parcel spans more than one zoning district. Check the work location on the city's signed zoning maps."
                  : "The city's zoning layers returned incomplete results. Check the Boston Zoning Viewer."}
              </p>
            )}
          </dl>
        </>
      ) : (
        <div className="p-card">
          <MapUnavailable address={line} />
        </div>
      )}
    </section>
  );
}

const STATUS_ORDER: ApplicationStatus[] = ["submitted", "ai_review", "awaiting_official", "returned", "approved"];
const STATUS_WORDS: Record<ApplicationStatus, string> = {
  submitted: "submitted",
  ai_review: "in review",
  awaiting_official: "awaiting an official",
  returned: "returned",
  approved: "approved",
};

/** Queue map: one pin per permit with a saved parcel, marked by status. */
export function PermitsMap({
  permits,
  hrefFor,
  className,
}: {
  permits: Application[];
  hrefFor: (a: Application) => string;
  className?: string;
}) {
  const summaryId = useId();
  const mapped = permits.filter((a): a is Application & { parcel: Parcel } => a.parcel !== null);
  const pins: MapPin[] = mapped.map((a) => ({
    id: a.id,
    lat: a.parcel.lat,
    lng: a.parcel.lng,
    status: a.status,
    title: `${a.permitNumber}, ${a.address.street}`,
    popup: (
      <span className="flex flex-col items-start gap-2">
        <StatusChip status={a.status} />
        <span className="text-ink">{a.address.street}</span>
        <Link href={hrefFor(a)} className="pp-link font-mono">
          {a.permitNumber}
        </Link>
      </span>
    ),
  }));
  const counts = STATUS_ORDER.map((s) => [s, mapped.filter((a) => a.status === s).length] as const).filter(
    ([, n]) => n > 0,
  );
  const unmapped = permits.length - mapped.length;
  return (
    <div className={cx("flex flex-col gap-3", className)}>
      <div className="relative isolate h-80 border border-border">
        <PinsMapCanvas
          pins={pins}
          label="Map of permits in the queue"
          describedBy={summaryId}
          className="h-full w-full"
        />
      </div>
      <ul className="flex flex-wrap items-center gap-3" aria-label="Map key">
        {counts.map(([s, n]) => (
          <li key={s} className="flex items-center gap-1.5">
            <StatusChip status={s} />
            <span className="font-mono text-sm text-ink">{n}</span>
          </li>
        ))}
        {unmapped > 0 && (
          <li className="text-sm text-muted">
            {unmapped} without a map
          </li>
        )}
      </ul>
      <p id={summaryId} className="sr-only">
        {`${mapped.length} of ${permits.length} permits are pinned. `}
        {counts.map(([s, n]) => `${n} ${STATUS_WORDS[s]}`).join(", ")}
        {". Tab to a pin and press Enter for its permit link. The list of permits follows the map."}
      </p>
    </div>
  );
}
