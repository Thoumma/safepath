"use client";

import { useMemo, useState } from "react";
import nextDynamic from "next/dynamic";
import { Card, CardContent, PanelTitle } from "@/components/ui/card";
import { toneForType, splitType, type CityPoint, type MapTone } from "@/lib/map-data";
import { cn } from "@/lib/utils";

// Leaflet touches `window` at import time; ssr:false must live in a client
// component (a server component cannot express it in Next 14).
const ThreatMap = nextDynamic(() => import("./threat-map").then((m) => m.ThreatMap), {
  ssr: false,
  loading: () => <div className="h-96 animate-pulse rounded-sm border border-border bg-muted" />,
});

const TONE_RANK: Record<MapTone, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const TONE_DOT: Record<MapTone, string> = {
  critical: "bg-critical",
  high: "bg-high",
  medium: "bg-medium",
  low: "bg-low",
};

export function ThreatMapSection({ points }: { points: CityPoint[] }) {
  // All case types present in the scoped data, gravest tone first.
  const allTypes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of points) {
      for (const { type, count } of p.byType) {
        counts.set(type, (counts.get(type) ?? 0) + count);
      }
    }
    return [...counts.entries()]
      .map(([type, count]) => ({ type, count, tone: toneForType(type) }))
      .sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone] || b.count - a.count);
  }, [points]);

  const [inactive, setInactive] = useState<Set<string>>(new Set());
  const [showReference, setShowReference] = useState(true);

  function toggle(type: string) {
    setInactive((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  // Re-aggregate under the filter. Percentages are relative to the filtered
  // grand total, so "share of what is shown" stays truthful.
  const filtered = useMemo(() => {
    const pts: CityPoint[] = [];
    let grandTotal = 0;
    for (const p of points) {
      const byType = p.byType.filter((t) => !inactive.has(t.type));
      const total = byType.reduce((sum, t) => sum + t.count, 0);
      if (total === 0) continue;
      pts.push({ ...p, byType, total, dominantType: byType[0].type });
      grandTotal += total;
    }
    return { pts, grandTotal };
  }, [points, inactive]);

  return (
    <Card>
      <PanelTitle lo="ແຜນທີ່ ເຫດການ" en="Threat map" />
      <CardContent className="space-y-3">
        {allTypes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={showReference}
              onClick={() => setShowReference((v) => !v)}
              title="UNODC GLOTIP 2024 — detected victims per country"
              className={cn(
                "flex items-center gap-1.5 rounded-sm border px-2 py-1 transition-colors duration-fast",
                showReference
                  ? "border-border-strong bg-card text-foreground"
                  : "border-border text-muted-foreground opacity-60"
              )}
            >
              <span
                aria-hidden
                className="size-2 shrink-0 border border-critical bg-critical/25"
              />
              <span lang="lo" className="font-lao text-xs leading-lao">
                ຊັ້ນ ອ້າງອີງ UNODC
              </span>
            </button>
            <span aria-hidden className="h-4 w-px bg-border" />
            {allTypes.map(({ type, count, tone }) => {
              const active = !inactive.has(type);
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(type)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-sm border px-2 py-1 transition-colors duration-fast",
                    active
                      ? "border-border-strong bg-card text-foreground"
                      : "border-border text-muted-foreground opacity-60"
                  )}
                >
                  <span aria-hidden className={cn("size-2 shrink-0", TONE_DOT[tone])} />
                  <span lang="lo" className="font-lao text-xs leading-lao">
                    {splitType(type).lo}
                  </span>
                  <span className="font-mono text-2xs tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {filtered.pts.length === 0 ? (
          <p
            lang="lo"
            className="grid h-96 place-items-center rounded-sm border border-border bg-muted font-lao text-sm leading-lao text-muted-foreground"
          >
            ບໍ່ມີ ເຄສ ທີ່ ມີ ຕຳແໜ່ງ GPS
          </p>
        ) : (
          <ThreatMap
            points={filtered.pts}
            total={filtered.grandTotal}
            showReference={showReference}
          />
        )}
        {showReference && (
          <p className="text-xs text-muted-foreground">
            <span lang="lo" className="font-lao leading-lao">
              ສີພື້ນ ປະເທດ = ຜູ້ເສຍຫາຍ ທີ່ ກວດພົບ (UNODC GLOTIP 2024) — ຂໍ້ມູນ ອ້າງອີງ, ບໍ່ແມ່ນ ເຄສ SafeZone
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
