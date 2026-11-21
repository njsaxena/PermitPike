"use client";

import { CircleCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Parcel, ParcelCandidate, ParcelLookupQuery } from "@permitpike/contract";
import {
  Button,
  ChoiceGroup,
  MapUnavailable,
  PropertyMap,
  Radio,
  ZoningChips,
  assessorAddressText,
} from "@/components/ui";
import { api } from "@/lib/api-client";

/*
 * "Is this the property?" on the filing form. Looks the address up as it is typed,
 * shows the pin, parcel outline and zoning district, and asks the applicant to
 * confirm. Lists candidates (with ZIP) when the address matches more than one parcel.
 * A failed or slow lookup shows the address and "Map unavailable": filing goes on.
 */

export type PropertyState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; parcel: Parcel; confirmed: boolean }
  | { kind: "rejected" }
  | { kind: "ambiguous"; candidates: ParcelCandidate[] }
  | { kind: "not_found" }
  | { kind: "unavailable" };

/** "15 PLEASANT ST, HYDE PARK MA 02136" -> { zip: "02136", neighborhood: "Hyde Park" } */
function placeOf(address: string): { zip: string | null; neighborhood: string | null } {
  const m = /,\s*(.+?)\s+MA\s+(\d{5})\s*$/i.exec(address);
  return m ? { neighborhood: assessorAddressText(m[1]!.toUpperCase()), zip: m[2]! } : { zip: null, neighborhood: null };
}

const looksLikeStreet = (s: string) => /^\d+[A-Za-z]?(-\d+)?\s+\S{2,}/.test(s.trim());
const DEBOUNCE_MS = 700;

export function PropertyConfirm({
  street,
  zip,
  state,
  onState,
  onPlace,
  error,
}: {
  street: string;
  zip: string;
  state: PropertyState;
  onState: (s: PropertyState) => void;
  /** A picked candidate fills in the ZIP (and neighborhood) it belongs to. */
  onPlace: (place: { zip: string; neighborhood: string | null }) => void;
  error?: string;
}) {
  const inflight = useRef<AbortController | null>(null);
  // The street|zip the current state belongs to, so filling the ZIP from a pick doesn't look it up again.
  const settledKey = useRef("");
  const [picked, setPicked] = useState<string | null>(null);

  async function run(query: ParcelLookupQuery, key: string) {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    settledKey.current = key;
    onState({ kind: "loading" });
    try {
      const res = await api.lookupParcel(query, controller.signal);
      if (controller.signal.aborted) return;
      if (res.result === "found") onState({ kind: "found", parcel: res.parcel, confirmed: false });
      else if (res.result === "ambiguous") onState({ kind: "ambiguous", candidates: res.candidates });
      else onState({ kind: res.result });
    } catch {
      // Aborted by a newer lookup.
    }
  }

  const z = zip.trim();
  const key = `${street.trim().toUpperCase()}|${/^\d{5}$/.test(z) ? z : ""}`;
  useEffect(() => {
    if (key === settledKey.current) return;
    if (!looksLikeStreet(street)) {
      inflight.current?.abort();
      settledKey.current = key;
      onState({ kind: "idle" });
      return;
    }
    const [s = "", zz = ""] = key.split("|");
    const t = setTimeout(() => {
      setPicked(null);
      void run({ address: street.trim() || s, ...(zz ? { zip: zz } : {}) }, key);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => () => inflight.current?.abort(), []);

  function pick(c: ParcelCandidate) {
    setPicked(c.parcelId);
    const place = placeOf(c.addresses[0] ?? "");
    const nextKey = `${street.trim().toUpperCase()}|${place.zip ?? ""}`;
    if (place.zip) onPlace({ zip: place.zip, neighborhood: place.neighborhood });
    void run({ pid: c.parcelId }, nextKey);
  }

  const typed = [street.trim(), "Boston MA", /^\d{5}$/.test(z) ? z : ""].filter(Boolean).join(", ");

  return (
    <section aria-labelledby="property" aria-busy={state.kind === "loading"} className="flex flex-col gap-3">
      <div aria-live="polite" className="sr-only">
        {state.kind === "loading" && "Finding the property."}
        {state.kind === "found" && !state.confirmed && "Property found. Confirm it below the map."}
        {state.kind === "ambiguous" && `${state.candidates.length} properties match. Choose one.`}
        {(state.kind === "not_found" || state.kind === "unavailable") && "Map unavailable."}
      </div>

      {state.kind === "idle" && null}

      {state.kind === "loading" && (
        <>
          <h2 id="property" className="text-lg font-semibold text-ink">
            Finding the property
          </h2>
          <div aria-hidden className="h-64 border border-border bg-sunken" />
        </>
      )}

      {state.kind === "found" && (
        <>
          <h2 id="property" className="flex items-center gap-2 text-lg font-semibold text-ink">
            {state.confirmed && <CircleCheck aria-hidden className="size-5 text-positive" strokeWidth={1.75} />}
            {state.confirmed ? "Property confirmed" : "Is this the property?"}
          </h2>
          <PropertyMap
            parcel={state.parcel}
            address={state.parcel.assessorAddress ? assessorAddressText(state.parcel.assessorAddress) : typed}
          />
          <div className="flex flex-col gap-2">
            <p className="text-ink">
              {state.parcel.assessorAddress ? assessorAddressText(state.parcel.assessorAddress) : typed}
              <span className="font-mono text-sm text-muted"> · Parcel {state.parcel.parcelId}</span>
            </p>
            <ZoningChips parcel={state.parcel} />
          </div>
          {state.confirmed ? (
            <div>
              <Button variant="quiet" size="sm" onClick={() => onState({ ...state, confirmed: false })}>
                Change
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => onState({ ...state, confirmed: true })}>
                Yes, this is the property
              </Button>
              <Button variant="quiet" onClick={() => onState({ kind: "rejected" })}>
                No, it isn't
              </Button>
            </div>
          )}
          {error && <p className="text-sm text-critical">{error}</p>}
        </>
      )}

      {state.kind === "rejected" && (
        <>
          <h2 id="property" className="text-lg font-semibold text-ink">
            Property not confirmed
          </h2>
          <p className="text-ink">
            Check the street number and ZIP code above. You can still file; the official will check the property.
          </p>
        </>
      )}

      {state.kind === "ambiguous" && (
        <>
          <h2 id="property" className="text-lg font-semibold text-ink">
            Which property is it?
          </h2>
          <ChoiceGroup legend={`${state.candidates.length} Boston parcels match this address`}>
            {state.candidates.map((c) => (
              <Radio
                key={c.parcelId}
                name="parcel-candidate"
                value={c.parcelId}
                checked={picked === c.parcelId}
                onChange={() => pick(c)}
                label={c.addresses[0] ? assessorAddressText(c.addresses[0]) : `Parcel ${c.parcelId}`}
                description={`Parcel ${c.parcelId}${c.addresses.length > 1 ? `, ${c.addresses.length - 1} more address${c.addresses.length > 2 ? "es" : ""}` : ""}`}
              />
            ))}
          </ChoiceGroup>
        </>
      )}

      {(state.kind === "not_found" || state.kind === "unavailable") && (
        <>
          <h2 id="property" className="sr-only">
            Property
          </h2>
          <MapUnavailable address={typed} />
          {state.kind === "not_found" && (
            <p className="text-sm text-ink">
              No Boston parcel matches this address. Check the street number, or file anyway.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** The parcel to send with the filing, or null. */
export function confirmedParcelId(state: PropertyState): string | null {
  return state.kind === "found" && state.confirmed ? state.parcel.parcelId : null;
}
