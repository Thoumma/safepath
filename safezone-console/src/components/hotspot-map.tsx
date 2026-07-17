"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { Hotspot } from "@/lib/hotspots";
import { SEVERITY, type SeverityKey } from "@/lib/constants";

/**
 * The hotspot map itself. Loaded with `ssr: false` (leaflet needs `window`),
 * so keep everything here render-only — data arrives pre-clustered from the
 * server.
 *
 * Marker grammar (never color alone):
 *   size   = case count (also printed inside the mark)
 *   color  = loudest severity in the cluster (the console's status tokens)
 *   shape  = square + ring means suspected compound; circle is everything else
 */
export default function HotspotMap({ hotspots }: { hotspots: Hotspot[] }) {
  const bounds =
    hotspots.length > 0
      ? L.latLngBounds(hotspots.map((h) => [h.lat, h.lng] as [number, number])).pad(0.25)
      : L.latLngBounds([
          [5, 95],
          [22, 110],
        ]); // SE Asia when there is nothing to show

  return (
    <MapContainer
      bounds={bounds}
      scrollWheelZoom={false}
      className="z-0 h-96 w-full border border-border"
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {hotspots.map((h) => (
        <Marker
          key={`${h.lat},${h.lng}`}
          position={[h.lat, h.lng]}
          icon={markerIcon(h)}
        >
          <Popup maxWidth={280}>
            <div className="space-y-2 font-sans">
              <div>
                <div className="text-sm font-bold">{h.place}</div>
                <div lang="lo" className="font-lao text-xs leading-lao text-muted-foreground">
                  {h.count} ເຄສ · {h.traffickingCount} ຄາດ ຄ້າມະນຸດ · {h.criticalCount} ດ່ວນ
                </div>
              </div>
              {h.suspectedCompound && (
                <div
                  lang="lo"
                  className="border border-critical px-2 py-1 font-lao text-xs font-semibold leading-lao text-critical-ink"
                >
                  ສົງໄສ ເປັນ ຈຸດ ກັກຂັງ / scam compound — ສົ່ງ ໃຫ້ VFI ກວດ
                </div>
              )}
              <ul className="max-h-36 space-y-1 overflow-y-auto border-t border-border pt-2">
                {h.cases.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-xs">
                    <span
                      aria-hidden
                      className={`size-2 shrink-0 ${SEVERITY[c.severity as SeverityKey].dot}`}
                    />
                    <a
                      href={`/cases/${c.id}`}
                      className="font-mono tabular-nums underline-offset-2 hover:underline"
                    >
                      {c.refNo}
                    </a>
                    <span lang="lo" className="min-w-0 truncate font-lao leading-lao text-muted-foreground">
                      {c.type.split(" / ")[0]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function markerIcon(h: Hotspot): L.DivIcon {
  // Area scales with count so a 6-case cluster reads bigger, not 6× bigger.
  const d = Math.round(Math.min(30 + Math.sqrt(h.count) * 8, 56));
  const color = SEVERITY[h.maxSeverity as SeverityKey].badge;
  const shape = h.suspectedCompound
    ? "rounded-sm ring-2 ring-critical ring-offset-2 ring-offset-background"
    : "rounded-full";

  return L.divIcon({
    className: "", // kill leaflet's default white box
    html: `<div class="grid place-items-center ${shape} ${color} border border-background/60 font-mono text-xs font-bold tabular-nums shadow-sm" style="width:${d}px;height:${d}px">${h.count}</div>`,
    iconSize: [d, d],
    iconAnchor: [d / 2, d / 2],
    popupAnchor: [0, -d / 2],
  });
}
