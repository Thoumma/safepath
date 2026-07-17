import type { CaseMapRow } from "@/lib/queries";

/** Tone = the semantic color family a case type maps to on the threat map.
 *  Same vocabulary as SEVERITY/CHART: red is trafficking because red means
 *  emergency everywhere else in this console — never decoration. */
export type MapTone = "critical" | "high" | "medium" | "low";

export type CityPoint = {
  city: string;
  country: string | null;
  lat: number;
  lng: number;
  total: number;
  /** Full "Lao / English" type strings with counts, descending. */
  byType: { type: string; count: number }[];
  dominantType: string;
};

const TONE_RANK: Record<MapTone, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** Case `type` is free text "ລາວ / English"; classify on the English half. */
export function toneForType(type: string): MapTone {
  const en = (type.split(" / ")[1] ?? type).toLowerCase();
  if (en.includes("traffick")) return "critical";
  if (en.includes("accident")) return "high";
  if (en.includes("medical")) return "medium";
  return "low";
}

export function splitType(type: string): { lo: string; en: string } {
  const [lo, en] = type.split(" / ");
  return { lo: lo ?? type, en: en ?? "" };
}

/** Group scoped case rows into one point per city, counting per type.
 *  Dominant type = highest count; ties break toward the graver tone so a
 *  city that is half trafficking never renders as a quiet dot. */
export function aggregateCityPoints(rows: CaseMapRow[]): CityPoint[] {
  const byCity = new Map<string, { row: CaseMapRow; counts: Map<string, number> }>();

  for (const row of rows) {
    if (row.lat == null || row.lng == null) continue;
    const key = row.city ?? `${row.lat.toFixed(2)},${row.lng.toFixed(2)}`;
    const entry = byCity.get(key) ?? { row, counts: new Map<string, number>() };
    entry.counts.set(row.type, (entry.counts.get(row.type) ?? 0) + 1);
    byCity.set(key, entry);
  }

  return [...byCity.entries()].map(([key, { row, counts }]) => {
    const byType = [...counts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort(
        (a, b) =>
          b.count - a.count || TONE_RANK[toneForType(a.type)] - TONE_RANK[toneForType(b.type)]
      );
    const total = byType.reduce((sum, t) => sum + t.count, 0);
    return {
      city: row.city ?? key,
      country: row.country,
      lat: row.lat as number,
      lng: row.lng as number,
      total,
      byType,
      dominantType: byType[0].type,
    };
  });
}
