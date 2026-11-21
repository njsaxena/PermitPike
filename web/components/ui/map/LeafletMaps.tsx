"use client";

/*
 * The Leaflet layer. Browser-only (Leaflet touches window on import), so it is loaded
 * through next/dynamic with ssr:false from ../PropertyMap.tsx and never exported
 * from the ui index directly.
 */
import L from "leaflet";
import { useEffect, useMemo, type ReactNode } from "react";
import { AttributionControl, GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { ApplicationStatus, Parcel } from "@permitpike/contract";

// OpenStreetMap standard tiles, shown in grayscale (globals.css) so the basemap stays quiet
// under the parcel and pins. Attribution stays visible, as the OSM license requires.
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const PREFIX = '<a href="https://leafletjs.com">Leaflet</a>';
const BOSTON: L.LatLngTuple = [42.3355, -71.0789];

/* Pins are a square head on a stem, drawn from the status chip's mark shapes. */
const HEAD = "position:absolute;left:0;top:0;width:18px;height:18px;box-sizing:border-box;border:1px solid var(--pp-ink);display:flex;align-items:center;justify-content:center";
const STEM = "position:absolute;left:8px;top:18px;width:2px;height:10px;background:var(--pp-ink)";
const CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="square"><path d="M4 12l5 5L20 6"/></svg>';
const CROSS = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="square"><path d="M6 6l12 12M18 6L6 18"/></svg>';

function pinIcon(fill: string, mark = "", color = "var(--pp-ink)") {
  return L.divIcon({
    className: "pp-pin",
    html: `<span aria-hidden="true" style="position:relative;display:block;width:18px;height:28px"><span style="${HEAD};background:${fill};color:${color}">${mark}</span><span style="${STEM}"></span></span>`,
    iconSize: [18, 28],
    iconAnchor: [9, 28],
    popupAnchor: [0, -26],
  });
}

const PROPERTY_PIN = pinIcon("var(--pp-critical)");

const box = (style: string, inner = "") =>
  `<span style="display:flex;width:8px;height:8px;border:1px solid var(--pp-ink);${style}">${inner}</span>`;
export const STATUS_PINS: Record<ApplicationStatus, L.DivIcon> = {
  submitted: pinIcon("var(--pp-surface)", box("")),
  ai_review: pinIcon("var(--pp-accent-tint)", box("", '<span style="width:50%;height:100%;background:var(--pp-ink)"></span>')),
  awaiting_official: pinIcon("var(--pp-accent)", box("background:var(--pp-ink)")),
  returned: pinIcon("var(--pp-critical-tint)", CROSS, "var(--pp-critical)"),
  approved: pinIcon("var(--pp-positive-tint)", CHECK, "var(--pp-positive)"),
};

/** Puts the accessible name and text summary on Leaflet's focusable container. */
function A11y({ label, describedBy }: { label: string; describedBy: string }) {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", label);
    el.setAttribute("aria-describedby", describedBy);
    el.setAttribute("aria-roledescription", "map");
  }, [map, label, describedBy]);
  return null;
}

function FitTo({ bounds, zoom }: { bounds: L.LatLngBounds | null; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    if (bounds.getNorthEast().equals(bounds.getSouthWest())) map.setView(bounds.getCenter(), zoom);
    else map.fitBounds(bounds, { padding: [32, 32], maxZoom: zoom });
  }, [map, bounds, zoom]);
  return null;
}

function Base({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MapContainer
      center={BOSTON}
      zoom={13}
      maxZoom={19}
      scrollWheelZoom={false}
      attributionControl={false}
      className={className}
    >
      <TileLayer url={TILES} attribution={ATTRIBUTION} maxZoom={19} />
      <AttributionControl prefix={PREFIX} />
      {children}
    </MapContainer>
  );
}

export interface ParcelMapCanvasProps {
  parcel: Parcel;
  label: string;
  describedBy: string;
  className?: string;
}

export function ParcelMapCanvas({ parcel, label, describedBy, className }: ParcelMapCanvasProps) {
  const bounds = useMemo(() => {
    if (!parcel.outline) return L.latLngBounds([parcel.lat, parcel.lng], [parcel.lat, parcel.lng]);
    return L.geoJSON(parcel.outline).getBounds();
  }, [parcel]);
  return (
    <Base className={className}>
      <A11y label={label} describedBy={describedBy} />
      <FitTo bounds={bounds} zoom={19} />
      {parcel.outline && (
        <GeoJSON key={parcel.parcelId} data={parcel.outline} style={{ className: "pp-parcel" }} interactive={false} />
      )}
      <Marker position={[parcel.lat, parcel.lng]} icon={PROPERTY_PIN} keyboard={false} interactive={false} />
    </Base>
  );
}

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  status: ApplicationStatus;
  /** Accessible name for the pin, e.g. "EL-2026-00042, 210 Dorchester St, Awaiting official". */
  title: string;
  popup: ReactNode;
}

export function PinsMapCanvas({
  pins,
  label,
  describedBy,
  className,
}: {
  pins: MapPin[];
  label: string;
  describedBy: string;
  className?: string;
}) {
  const bounds = useMemo(
    () => (pins.length ? L.latLngBounds(pins.map((p) => [p.lat, p.lng] as L.LatLngTuple)) : null),
    [pins],
  );
  return (
    <Base className={className}>
      <A11y label={label} describedBy={describedBy} />
      <FitTo bounds={bounds} zoom={16} />
      {pins.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={STATUS_PINS[p.status]}
          title={p.title}
          eventHandlers={{ add: (e) => (e.target as L.Marker).getElement()?.setAttribute("aria-label", p.title) }}
        >
          <Popup>{p.popup}</Popup>
        </Marker>
      ))}
    </Base>
  );
}
