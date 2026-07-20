"use client";

import nextDynamic from "next/dynamic";
import { Card, CardContent, PanelTitle } from "@/components/ui/card";
import type { LiveCasePin, JourneyPin } from "@/components/live-map";

// Leaflet touches `window` at import time; ssr:false must live in a client
// component (a server component cannot express it in Next 14).
const LiveMap = nextDynamic(() => import("./live-map").then((m) => m.LiveMap), {
  ssr: false,
  loading: () => <div className="h-[32rem] animate-pulse rounded-sm border border-border bg-muted" />,
});

export function LiveMapSection({ cases, journeys }: { cases: LiveCasePin[]; journeys: JourneyPin[] }) {
  return (
    <Card>
      <PanelTitle lo="ຕຳແໜ່ງ ປັດຈຸບັນ" en="Current positions" />
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-critical" />
            <span lang="lo" className="font-lao text-xs leading-lao">
              ເຄສ SOS ເປີດຢູ່
            </span>
            <span className="font-mono text-2xs tabular-nums text-muted-foreground">{cases.length}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-medium" />
            <span lang="lo" className="font-lao text-xs leading-lao">
              ແບ່ງປັນການເດີນທາງ
            </span>
            <span className="font-mono text-2xs tabular-nums text-muted-foreground">{journeys.length}</span>
          </span>
        </div>

        {cases.length === 0 && journeys.length === 0 ? (
          <p
            lang="lo"
            className="grid h-[32rem] place-items-center rounded-sm border border-border bg-muted font-lao text-sm leading-lao text-muted-foreground"
          >
            ບໍ່ມີ ຕຳແໜ່ງ ສົດ ໃນ ຂະນະນີ້
          </p>
        ) : (
          <LiveMap cases={cases} journeys={journeys} />
        )}
      </CardContent>
    </Card>
  );
}
