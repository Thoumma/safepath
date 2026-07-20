"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { latLngBounds } from "leaflet";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from "react-leaflet";
import Link from "next/link";
import { SEVERITY, type SeverityKey } from "@/lib/constants";

export type TrailPoint = { lat: number; lng: number };

export type LiveCasePin = {
  id: string;
  refNo: string;
  severity: SeverityKey;
  citizenName: string;
  lat: number;
  lng: number;
  trail: TrailPoint[];
  /** Fresh fix within the live window (2 min) — the trail is still moving. */
  live: boolean;
  updatedAgo: string;
};

export type JourneyPin = {
  citizenId: string;
  citizenName: string;
  phone: string | null;
  lat: number;
  lng: number;
  trail: TrailPoint[];
  live: boolean;
  updatedAgo: string;
};

function allPoints(cases: LiveCasePin[], journeys: JourneyPin[]) {
  const pts: [number, number][] = [];
  for (const c of cases) {
    pts.push([c.lat, c.lng]);
    for (const p of c.trail) pts.push([p.lat, p.lng]);
  }
  for (const j of journeys) {
    pts.push([j.lat, j.lng]);
    for (const p of j.trail) pts.push([p.lat, p.lng]);
  }
  return pts;
}

/** `MapContainer.bounds` is initial-only; refit when a refresh moves people. */
function FitBounds({ cases, journeys }: { cases: LiveCasePin[]; journeys: JourneyPin[] }) {
  const map = useMap();
  useEffect(() => {
    const pts = allPoints(cases, journeys);
    if (pts.length > 0) map.fitBounds(latLngBounds(pts).pad(0.25), { maxZoom: 15 });
  }, [map, cases, journeys]);
  return null;
}

/**
 * Where everyone is *right now*: red pins/trails are open SOS cases, primary
 * (navy) pins/trails are citizens who switched on journey sharing. The same
 * loudness rule as everywhere else in the console — an emergency is loud, a
 * routine share is quiet.
 */
export function LiveMap({ cases, journeys }: { cases: LiveCasePin[]; journeys: JourneyPin[] }) {
  const pts = allPoints(cases, journeys);

  return (
    <div className="h-[32rem] overflow-hidden rounded-sm border border-border">
      <MapContainer
        bounds={pts.length > 0 ? latLngBounds(pts).pad(0.25) : undefined}
        center={pts.length === 0 ? [15.5, 103] : undefined}
        zoom={pts.length === 0 ? 5 : undefined}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds cases={cases} journeys={journeys} />

        {/* Journeys under cases: when the two overlap, the emergency wins the eye. */}
        {journeys.map((j) => (
          <Polyline
            key={`jt-${j.citizenId}`}
            positions={j.trail.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ className: "map-trail map-trail--journey" }}
          />
        ))}
        {journeys.map((j) => (
          <CircleMarker
            key={`j-${j.citizenId}`}
            center={[j.lat, j.lng]}
            radius={9}
            pathOptions={{ className: "map-dot map-dot--medium" }}
          >
            <Popup>
              <div className="min-w-44">
                <div lang="lo" className="font-lao text-sm font-semibold leading-lao">
                  {j.citizenName}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  <span lang="lo" className="font-lao">
                    ແບ່ງປັນການເດີນທາງ
                  </span>{" "}
                  · Journey
                </div>
                <div className="mt-1 font-mono text-xs tabular-nums">
                  {j.live ? "LIVE · " : ""}
                  {j.updatedAgo}
                </div>
                {j.phone && <div className="mt-1 font-mono text-xs">{j.phone}</div>}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {cases.map((c) => (
          <Polyline
            key={`ct-${c.id}`}
            positions={c.trail.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ className: "map-trail map-trail--sos" }}
          />
        ))}
        {cases.map((c) => (
          <CircleMarker
            key={`c-${c.id}`}
            center={[c.lat, c.lng]}
            radius={11}
            pathOptions={{ className: "map-dot map-dot--critical" }}
          >
            <Popup>
              <div className="min-w-44">
                <div lang="lo" className="font-lao text-sm font-semibold leading-lao">
                  {c.citizenName}
                </div>
                <div className="mt-0.5 flex items-baseline justify-between gap-3">
                  <span className="font-mono text-xs">{c.refNo}</span>
                  <span lang="lo" className="font-lao text-xs">
                    {SEVERITY[c.severity].lo}
                  </span>
                </div>
                <div className="mt-1 font-mono text-xs tabular-nums">
                  {c.live ? "LIVE · " : ""}
                  {c.updatedAgo}
                </div>
                <Link
                  href={`/admin/cases/${c.id}`}
                  className="mt-2 inline-block text-xs font-semibold text-primary underline underline-offset-2"
                >
                  <span lang="lo" className="font-lao">
                    ເປີດ ເຄສ
                  </span>
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
