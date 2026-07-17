/**
 * External threat-intelligence REFERENCE data — published aggregates, NOT
 * SafeZone case data. Every entry carries its source, publication, URL and
 * the date we extracted it, and the UI must always label this layer as
 * ອ້າງອີງ/Reference so an officer can never confuse a published baseline
 * with our own live cases.
 *
 * Update cadence: UNODC publishes GLOTIP every ~2 years (next expected late
 * 2026). Refresh by re-extracting the country-data tables and bumping
 * `accessedAt`. Only aggregates are stored here — never victim-level rows,
 * even where sources (e.g. CTDC) offer them.
 */

export type ThreatReferenceEntry = {
  /** ISO 3166-1 alpha-2, matches Case.country */
  iso2: string;
  countryLo: string;
  countryEn: string;
  metric: "detected_victims";
  /** year → value; UNODC suppresses figures <5, we store only published numbers */
  series: Record<number, number>;
  sourceOrg: string;
  publication: string;
  sourceUrl: string;
  accessedAt: string; // ISO date
};

const GLOTIP_2024 = {
  publication: "UNODC Global Report on Trafficking in Persons 2024 — Country data, East Asia and the Pacific",
  sourceUrl:
    "https://www.unodc.org/documents/data-and-analysis/glotip/2024/East_Asia_the_Pacific_GLOTIP2024.pdf",
  accessedAt: "2026-07-16",
} as const;

export const THREAT_REFERENCE: ThreatReferenceEntry[] = [
  {
    iso2: "TH",
    countryLo: "ໄທ",
    countryEn: "Thailand",
    metric: "detected_victims",
    series: { 2019: 1541, 2020: 155, 2021: 190, 2022: 295, 2023: 701 },
    sourceOrg: "National Electronic Database System for Human Trafficking (E-AHT), via UNODC",
    ...GLOTIP_2024,
  },
  {
    iso2: "MM",
    countryLo: "ມຽນມາ",
    countryEn: "Myanmar",
    metric: "detected_victims",
    series: { 2019: 358, 2020: 167, 2021: 29, 2022: 53, 2023: 82 },
    sourceOrg: "Anti-Trafficking in Persons Division, Myanmar Police Force, via UNODC",
    ...GLOTIP_2024,
  },
  {
    iso2: "KH",
    countryLo: "ກຳປູເຈຍ",
    countryEn: "Cambodia",
    metric: "detected_victims",
    series: { 2021: 54, 2022: 62, 2023: 73 },
    sourceOrg: "National Committee for Counter Trafficking (NCCT), via UNODC",
    ...GLOTIP_2024,
  },
  {
    iso2: "MY",
    countryLo: "ມາເລເຊຍ",
    countryEn: "Malaysia",
    metric: "detected_victims",
    series: { 2019: 91, 2020: 83, 2021: 117, 2022: 75 },
    sourceOrg: "National Strategic Office, Council for Anti-Trafficking in Persons (MAPO), via UNODC",
    ...GLOTIP_2024,
  },
];

/** Known gaps — stated, not hidden. A missing country must never read as
 *  "no trafficking there"; it means the country did not report. */
export const THREAT_REFERENCE_NOTES: { lo: string; en: string }[] = [
  {
    lo: "ສປປ ລາວ ບໍ່ມີ ຂໍ້ມູນ ໃນ GLOTIP 2024 (ບໍ່ໄດ້ ລາຍງານ ຫາ UNODC)",
    en: "Lao PDR has no country profile in GLOTIP 2024 (did not report to UNODC)",
  },
  {
    lo: "CTDC (ctdatacollaborative.org) ມີ ຊຸດຂໍ້ມູນ ລະອຽດ ກວ່າ — ຕ້ອງ ດາວໂຫລດ ດ້ວຍ browser",
    en: "CTDC offers a richer dataset — requires manual browser download (bot-blocked)",
  },
];

export function latestOf(e: ThreatReferenceEntry): { year: number; value: number } {
  const year = Math.max(...Object.keys(e.series).map(Number));
  return { year, value: e.series[year] };
}
