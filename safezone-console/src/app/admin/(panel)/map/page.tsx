import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatBlock } from "@/components/stat-card";
import { AutoRefresh } from "@/components/auto-refresh";
import { LiveMapSection } from "@/components/live-map-section";
import type { LiveCasePin, JourneyPin } from "@/components/live-map";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SeverityKey } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** A journey (or case fix) older than this has gone stale and leaves the map —
 *  matching the freshness rule in `/api/me/guardians`. */
const FRESH_WINDOW_MS = 2 * 60 * 60 * 1000;
/** "LIVE" chip: the stream delivered a fix within the last two minutes. */
const LIVE_WINDOW_MS = 2 * 60 * 1000;

function timeAgoLao(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "ຫາກໍ່ດຽວນີ້";
  if (mins < 60) return `${mins} ນາທີກ່ອນ`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ຊົ່ວໂມງກ່ອນ`;
  return `${Math.floor(hours / 24)} ມື້ກ່ອນ`;
}

/**
 * /admin/map — every live position the console knows, on one map.
 *
 * Two layers, mirroring the app's Guardian map: open SOS cases (red, DURESS
 * *included* — the officer must see a coerced victim; the DURESS filter exists
 * only on the `/api/me/*` surface the device reads) and opt-in journey shares
 * (navy, routine). Embassy-only: live whereabouts are among the most sensitive
 * data here, so PARTNER staff have neither the nav item nor the page.
 */
export default async function LiveMapPage() {
  const staff = await requireStaff();
  if (staff.role === "PARTNER") redirect("/admin");

  const trailSince = new Date(Date.now() - FRESH_WINDOW_MS);

  // Trail caps are a payload budget, not a display limit. Every point fetched
  // is serialized into the client bundle of a page that re-renders every 15s,
  // and past ~100 points a polyline gains no visible detail — it just costs
  // bytes on a duty officer's connection. `select` keeps the columns to the
  // three the map actually draws with.
  const TRAIL_POINTS = 120;
  const [openCases, sharing] = await Promise.all([
    prisma.case.findMany({
      where: { status: { in: ["NEW", "IN_PROGRESS"] }, lat: { not: null }, lng: { not: null } },
      select: {
        id: true,
        refNo: true,
        severity: true,
        lat: true,
        lng: true,
        createdAt: true,
        citizen: { select: { fullName: true } },
        // Newest first so the cap keeps the *recent* end of a long trail;
        // reversed below because a polyline wants oldest → newest.
        locations: {
          orderBy: { createdAt: "desc" },
          take: TRAIL_POINTS,
          select: { lat: true, lng: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.citizen.findMany({
      where: { journeySharing: true, lastJourneyAt: { gte: trailSince } },
      select: {
        id: true,
        fullName: true,
        phone: true,
        journeyLat: true,
        journeyLng: true,
        lastJourneyAt: true,
        journeyLocations: {
          where: { createdAt: { gte: trailSince } },
          orderBy: { createdAt: "desc" },
          take: TRAIL_POINTS,
          select: { lat: true, lng: true, createdAt: true },
        },
      },
    }),
  ]);

  const cases: LiveCasePin[] = openCases.map((c) => {
    const latest = c.locations[0]?.createdAt ?? c.createdAt;
    return {
      id: c.id,
      refNo: c.refNo,
      severity: c.severity as SeverityKey,
      citizenName: c.citizen.fullName,
      lat: c.lat!,
      lng: c.lng!,
      trail: c.locations
        .slice()
        .reverse()
        .map((l) => ({ lat: l.lat, lng: l.lng })),
      live: Date.now() - latest.getTime() < LIVE_WINDOW_MS,
      updatedAgo: timeAgoLao(latest),
    };
  });

  const journeys: JourneyPin[] = sharing
    .filter((s) => s.journeyLat != null && s.journeyLng != null)
    .map((s) => ({
      citizenId: s.id,
      citizenName: s.fullName,
      phone: s.phone,
      lat: s.journeyLat!,
      lng: s.journeyLng!,
      // Fetched newest-first (so the cap keeps the recent end); a polyline
      // wants oldest → newest.
      trail: s.journeyLocations
        .slice()
        .reverse()
        .map((l) => ({ lat: l.lat, lng: l.lng })),
      live: Date.now() - s.lastJourneyAt!.getTime() < LIVE_WINDOW_MS,
      updatedAgo: timeAgoLao(s.lastJourneyAt!),
    }));

  const liveCount = cases.filter((c) => c.live).length + journeys.filter((j) => j.live).length;

  return (
    <>
      <PageHeader lo="ແຜນທີ່ ສົດ" en="Live map" sub="ເຄສ SOS ເປີດຢູ່ ແລະ ການແບ່ງປັນການເດີນທາງ" />
      {/* Positions move; the page follows. Polling only while there is
          something on the map to move. */}
      <AutoRefresh active={cases.length + journeys.length > 0} seconds={15} />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          <StatBlock lo="ເຄສ SOS ເປີດຢູ່" en="Open SOS" value={cases.length} tone="critical" />
          <StatBlock lo="ແບ່ງປັນການເດີນທາງ" en="Sharing journey" value={journeys.length} />
          <StatBlock lo="ສົດ ໃນ 2 ນາທີ" en="Live now" value={liveCount} tone="success" live />
        </div>

        <LiveMapSection cases={cases} journeys={journeys} />
      </div>
    </>
  );
}
