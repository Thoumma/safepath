"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { latLngBounds, type Layer } from "leaflet";
import type { Feature } from "geojson";
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, useMap } from "react-leaflet";
import { toneForType, splitType, type CityPoint } from "@/lib/map-data";
import { THREAT_REFERENCE, latestOf } from "@/lib/threat-reference";
import { SEA_COUNTRIES } from "@/lib/sea-countries";
import { cn } from "@/lib/utils";

const TONE_SQUARE: Record<string, string> = {
  critical: "bg-critical",
  high: "bg-high",
  medium: "bg-medium",
  low: "bg-low",
};

function boundsFor(points: CityPoint[]) {
  return latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])).pad(0.25);
}

/** `MapContainer.bounds` is initial-only; refit when the filter changes. */
function FitBounds({ points }: { points: CityPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) map.fitBounds(boundsFor(points));
  }, [map, points]);
  return null;
}

// Published UNODC baseline per country (reference layer). Computed once at
// module level — the dataset is static per build.
const REF_BY_ISO2 = (() => {
  const rows = THREAT_REFERENCE.map((e) => ({ e, latest: latestOf(e) }));
  const sum = rows.reduce((s, r) => s + r.latest.value, 0);
  return new Map(
    rows.map(({ e, latest }) => [
      e.iso2,
      { ...latest, share: latest.value / sum, countryLo: e.countryLo, countryEn: e.countryEn },
    ])
  );
})();

function referenceStyle(feature?: Feature) {
  const ref = feature && REF_BY_ISO2.get(String(feature.properties?.iso2));
  if (!ref) {
    // Present but unreported (Laos): dashed outline, no fill — a gap that is
    // visible as a gap, never mistakable for "zero risk".
    return { className: "map-country map-country--nodata", fillOpacity: 0, weight: 1 };
  }
  // Shade intensity by that country's share of detected victims.
  return {
    className: "map-country",
    fillOpacity: 0.08 + 0.3 * ref.share,
    weight: 1,
  };
}

function bindReferenceTooltip(feature: Feature, layer: Layer) {
  const iso2 = String(feature.properties?.iso2);
  const ref = REF_BY_ISO2.get(iso2);
  const html = ref
    ? `<span lang="lo" class="font-lao">${ref.countryLo}</span> — ` +
      `${ref.value.toLocaleString()} <span lang="lo" class="font-lao">ຜູ້ເສຍຫາຍ</span> (${ref.year}) · ` +
      `${(ref.share * 100).toFixed(1)}%<br/>` +
      `<span class="text-muted">UNODC GLOTIP 2024 · <span lang="lo" class="font-lao">ອ້າງອີງ</span></span>`
    : `<span lang="lo" class="font-lao">ສປປ ລາວ — ບໍ່ມີ ຂໍ້ມູນ ລາຍງານ ຫາ UNODC</span>`;
  layer.bindTooltip(html, { sticky: true, direction: "top" });
}

/**
 * Where cases happen: one dot per city, area ∝ case count, color = the
 * gravest/most frequent case type there (red is trafficking, everywhere in
 * this console). Percentages are each city's share of `total`, which the
 * parent recomputes when the type filter changes.
 *
 * `showReference` adds the published-baseline layer UNDER the dots: country
 * shading by UNODC detected-victims share. Two layers, two stories — the
 * tooltip on each says which one it is.
 */
export function ThreatMap({
  points,
  total,
  showReference = false,
}: {
  points: CityPoint[];
  total: number;
  showReference?: boolean;
}) {
  const maxTotal = Math.max(1, ...points.map((p) => p.total));

  return (
    <div className="h-96 overflow-hidden rounded-sm border border-border">
      <MapContainer
        bounds={points.length > 0 ? boundsFor(points) : undefined}
        center={points.length === 0 ? [15.5, 103] : undefined}
        zoom={points.length === 0 ? 5 : undefined}
        // A dashboard map that hijacks the page scroll is a bug, not a feature.
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds points={points} />
        {showReference && (
          // Rendered before the markers so the SVG order keeps dots on top.
          <GeoJSON data={SEA_COUNTRIES} style={referenceStyle} onEachFeature={bindReferenceTooltip} />
        )}
        {points.map((p) => (
          <CircleMarker
            key={`${p.city}-${p.lat}-${p.lng}`}
            center={[p.lat, p.lng]}
            radius={6 + 14 * Math.sqrt(p.total / maxTotal)}
            pathOptions={{ className: `map-dot map-dot--${toneForType(p.dominantType)}` }}
          >
            <Popup>
              <div className="min-w-40">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold">{p.city}</span>
                  {p.country && (
                    <span className="font-mono text-2xs text-muted-foreground">{p.country}</span>
                  )}
                </div>
                <div className="mt-0.5 font-mono text-xs tabular-nums">
                  <span lang="lo" className="font-lao">
                    {p.total} ເຄສ
                  </span>{" "}
                  · {((p.total / Math.max(1, total)) * 100).toFixed(1)}%
                </div>
                <ul className="mt-2 space-y-1 border-t border-border pt-2">
                  {p.byType.map(({ type, count }) => (
                    <li key={type} className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={cn("size-2.5 shrink-0", TONE_SQUARE[toneForType(type)])}
                      />
                      <span lang="lo" className="min-w-0 flex-1 truncate font-lao">
                        {splitType(type).lo}
                      </span>
                      <span className="font-mono text-xs tabular-nums">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
