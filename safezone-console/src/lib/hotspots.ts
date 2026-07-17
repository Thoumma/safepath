import type { Severity } from "@prisma/client";

/**
 * Greedy geographic clustering for the Reports hotspot map.
 *
 * Cases within CLUSTER_RADIUS_KM of a cluster's running center merge into it.
 * 30 km is deliberate: it folds Myawaddy (MM) and Mae Sot (TH) — 7 km apart
 * across the border — into one corridor, while keeping Poipet, Phnom Penh and
 * Sihanoukville distinct. A cluster is only *intelligence* when it survives
 * the border-hopping that trafficking routes are built on.
 *
 * A cluster where trafficking-type cases are the majority (and there are at
 * least MIN_COMPOUND_CASES of them) is flagged a suspected compound. The flag
 * is a lead for VFI/embassy review, never an accusation — the UI words it
 * "suspected", and the underlying case list is one click away.
 */
export const CLUSTER_RADIUS_KM = 30;
export const MIN_COMPOUND_CASES = 3;

export type HotspotCase = {
  id: string;
  refNo: string;
  severity: Severity;
  type: string;
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
};

export type Hotspot = {
  lat: number;
  lng: number;
  /** Most common city name in the cluster, for the label. */
  place: string;
  count: number;
  traffickingCount: number;
  criticalCount: number;
  /** Loudest severity present — drives the marker color. */
  maxSeverity: Severity;
  suspectedCompound: boolean;
  cases: HotspotCase[];
};

const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 3,
  HIGH: 2,
  MEDIUM: 1,
  LOW: 0,
};

export function isTraffickingType(type: string): boolean {
  return type.includes("ຄ້າມະນຸດ") || /trafficking/i.test(type);
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function clusterCases(cases: HotspotCase[]): Hotspot[] {
  type Working = { lat: number; lng: number; cases: HotspotCase[] };
  const clusters: Working[] = [];

  for (const c of cases) {
    const home = clusters.find(
      (k) => haversineKm(k.lat, k.lng, c.lat, c.lng) <= CLUSTER_RADIUS_KM
    );
    if (home) {
      home.cases.push(c);
      // Running mean keeps the center on the mass of points, so a cluster
      // straddling a border sits between its two towns rather than on one.
      home.lat = home.cases.reduce((s, x) => s + x.lat, 0) / home.cases.length;
      home.lng = home.cases.reduce((s, x) => s + x.lng, 0) / home.cases.length;
    } else {
      clusters.push({ lat: c.lat, lng: c.lng, cases: [c] });
    }
  }

  return clusters
    .map((k) => {
      const traffickingCount = k.cases.filter((c) => isTraffickingType(c.type)).length;
      const criticalCount = k.cases.filter((c) => c.severity === "CRITICAL").length;
      const maxSeverity = k.cases.reduce<Severity>(
        (m, c) => (SEVERITY_RANK[c.severity] > SEVERITY_RANK[m] ? c.severity : m),
        "LOW"
      );

      const placeCounts = new Map<string, number>();
      for (const c of k.cases) {
        const p = c.city ?? c.country ?? "—";
        placeCounts.set(p, (placeCounts.get(p) ?? 0) + 1);
      }
      const place = [...placeCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const secondPlaces = [...placeCounts.keys()].filter((p) => p !== place);

      return {
        lat: k.lat,
        lng: k.lng,
        place: secondPlaces.length ? `${place} + ${secondPlaces.join(", ")}` : place,
        count: k.cases.length,
        traffickingCount,
        criticalCount,
        maxSeverity,
        suspectedCompound:
          traffickingCount >= MIN_COMPOUND_CASES &&
          traffickingCount * 2 >= k.cases.length,
        cases: k.cases,
      };
    })
    .sort((a, b) => b.count - a.count);
}
