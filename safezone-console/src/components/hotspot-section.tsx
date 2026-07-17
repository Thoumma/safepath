"use client";

import dynamic from "next/dynamic";
import { AlertTriangle } from "lucide-react";
import { Card, PanelTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEVERITY, type SeverityKey } from "@/lib/constants";
import type { Hotspot } from "@/lib/hotspots";
import { cn } from "@/lib/utils";

// Leaflet touches `window` at import time — client-only, no SSR.
const HotspotMap = dynamic(() => import("@/components/hotspot-map"), {
  ssr: false,
  loading: () => (
    <div className="grid h-96 w-full place-items-center border border-border bg-muted">
      <span lang="lo" className="font-lao text-sm leading-lao text-muted-foreground">
        ກຳລັງ ໂຫຼດ ແຜນທີ່…
      </span>
    </div>
  ),
});

/**
 * The intelligence panel: cases clustered on a map, plus the same clusters as
 * a ranked list (the accessible, screen-readable view of the identical data).
 * Individual rescues on the left, the pattern they form on the right — this
 * is where one SOS becomes evidence of a compound.
 */
export function HotspotSection({ hotspots }: { hotspots: Hotspot[] }) {
  const compounds = hotspots.filter((h) => h.suspectedCompound);

  return (
    <section>
      <Card>
        <PanelTitle lo="ແຜນທີ່ ຈຸດສ່ຽງ" en="Hotspot map — possible compounds" />
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
            <div className="space-y-2">
              <HotspotMap hotspots={hotspots} />
              {/* Legend: shape + size + color are all stated in words. */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-3 rounded-full border border-border bg-medium" />
                  <span lang="lo" className="font-lao leading-lao">
                    ວົງມົນ = ກຸ່ມ ເຄສ (ຕົວເລກ = ຈຳນວນ)
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-3 rounded-sm bg-critical ring-1 ring-critical ring-offset-1 ring-offset-background" />
                  <span lang="lo" className="font-lao leading-lao">
                    ສີ່ຫຼ່ຽມ = ສົງໄສ ຈຸດ ກັກຂັງ
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-3 rounded-full bg-critical" />
                  <span lang="lo" className="font-lao leading-lao">
                    ສີ = ຄວາມ ຮຸນແຮງ ສູງສຸດ ໃນ ກຸ່ມ
                  </span>
                </span>
              </div>
            </div>

            {/* Ranked list — the same clusters, readable without the map. */}
            <div className="space-y-px">
              <div lang="lo" className="border-b border-border-strong pb-2 font-lao text-xs font-semibold leading-lao">
                ຈຸດສ່ຽງ ອັນດັບ ຕົ້ນ ({compounds.length} ສົງໄສ ຈຸດ ກັກຂັງ)
              </div>
              <ol className="divide-y divide-border">
                {hotspots.slice(0, 7).map((h, i) => (
                  <li key={`${h.lat},${h.lng}`} className="flex items-center gap-3 py-2">
                    <span className="w-5 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{h.place}</div>
                      <div lang="lo" className="font-lao text-xs leading-lao text-muted-foreground">
                        {h.count} ເຄສ · {h.traffickingCount} ຄ້າມະນຸດ
                      </div>
                    </div>
                    {h.suspectedCompound ? (
                      <Badge className="shrink-0 bg-critical text-critical-foreground">
                        <AlertTriangle aria-hidden className="mr-1 size-3" />
                        <span lang="lo" className="font-lao">
                          ສົງໄສ
                        </span>
                      </Badge>
                    ) : (
                      <Badge className={cn("shrink-0", SEVERITY[h.maxSeverity as SeverityKey].badge)}>
                        <span lang="lo" className="font-lao">
                          {SEVERITY[h.maxSeverity as SeverityKey].lo}
                        </span>
                      </Badge>
                    )}
                  </li>
                ))}
              </ol>
              <p lang="lo" className="pt-2 font-lao text-xs leading-lao text-muted-foreground">
                „ສົງໄສ" = ເຄສ ຄ້າມະນຸດ ≥3 ຢູ່ ໃນ ລັດສະໝີ 30 ກມ — ເປັນ ຂໍ້ສັງເກດ ໃຫ້ VFI ກວດ,
                ບໍ່ ແມ່ນ ການ ຢືນຢັນ.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
