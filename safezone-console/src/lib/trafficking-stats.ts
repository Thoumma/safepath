/**
 * Published anti-trafficking statistics for the PUBLIC website — awareness copy,
 * not SafeZone case data. Same discipline as `threat-reference.ts`: every figure
 * carries a source, and the UI always shows the citation. We only store
 * published aggregates and never present a detected/identified count as if it
 * were the true prevalence — the two are complementary, not comparable.
 *
 * Verified July 2026 against the primary sources below. Refresh cadence:
 *   - UNODC GLOTIP  ~every 2 years (next expected late 2026)
 *   - ILO/Walk Free Global Estimates of Modern Slavery ~every 5 years
 *   - US State Dept TIP Report annually (June/July) — re-check the Laos tier
 *
 * Lao carries the meaning; English rides beneath as the annotation, matching
 * the rest of the product.
 */

export type StatSource = {
  org: string;
  publication: string;
  year: string;
  url: string;
};

export const SOURCES = {
  gems: {
    org: "ILO · Walk Free · IOM",
    publication: "Global Estimates of Modern Slavery",
    year: "2022",
    url: "https://www.ilo.org/publications/major-publications/global-estimates-modern-slavery-forced-labour-and-forced-marriage",
  },
  glotip: {
    org: "UNODC",
    publication: "Global Report on Trafficking in Persons 2024",
    year: "2024",
    url: "https://www.unodc.org/documents/data-and-analysis/glotip/2024/GLOTIP2024_BOOK.pdf",
  },
  gsi: {
    org: "Walk Free",
    publication: "Global Slavery Index 2023",
    year: "2023",
    url: "https://www.walkfree.org/global-slavery-index/findings/regional-findings/asia-and-the-pacific/",
  },
  ohchr: {
    org: "UN OHCHR",
    publication: "Online Scam Operations & Trafficking into Forced Criminality in SE Asia",
    year: "2023",
    url: "https://www.ohchr.org/en/press-releases/2023/08/hundreds-thousands-trafficked-work-online-scammers-se-asia-says-un-report",
  },
  tip: {
    org: "US Department of State",
    publication: "Trafficking in Persons Report 2025 — Laos",
    year: "2025",
    url: "https://www.state.gov/reports/2025-trafficking-in-persons-report/laos/",
  },
  rfa: {
    org: "Radio Free Asia",
    publication: "Golden Triangle SEZ, Bokeo",
    year: "2022",
    url: "https://www.rfa.org/english/news/laos/human-trafficking-06212022163113.html",
  },
} as const;

export type SourceId = keyof typeof SOURCES;

export type BigStat = {
  /** Numeric magnitude the counter animates to. */
  value: number;
  /** Digits after the decimal in the display, e.g. 27.6 → 1. */
  decimals?: number;
  /** Rendered right after the number, e.g. "M", "%", "+", " ລ້ານ". */
  suffix?: string;
  loCaption: string;
  enCaption: string;
  sourceId: SourceId;
  tone?: "critical" | "neutral" | "high";
  /** Optional Lao qualifier shown in the caption, e.g. "ປະມານ" / "ຢ່າງໜ້ອຍ". */
  loQualifier?: string;
};

/* ── The scale ────────────────────────────────────────────────────────────
   Aspiration → hard number. Two of these are prevalence (people living in
   modern slavery, an estimate); the fourth is detected victims in one year —
   labelled so it is never read as the true total. */
export const GLOBAL_SCALE: BigStat[] = [
  {
    value: 50,
    suffix: " ລ້ານ",
    loCaption: "ຄົນ ຕົກ ຢູ່ ໃນ ການ ເປັນ ຂ້າ ທາດ ຍຸກ ໃໝ່ ໃນ ໂລກ",
    enCaption: "people in modern slavery worldwide",
    loQualifier: "ປະມານ",
    sourceId: "gems",
    tone: "critical",
  },
  {
    value: 28,
    suffix: " ລ້ານ",
    loCaption: "ຖືກ ບັງຄັບ ໃຫ້ ອອກ ແຮງງານ",
    enCaption: "in forced labour",
    sourceId: "gems",
    tone: "high",
  },
  {
    value: 22,
    suffix: " ລ້ານ",
    loCaption: "ຖືກ ບັງຄັບ ໃຫ້ ແຕ່ງງານ",
    enCaption: "in forced marriage",
    sourceId: "gems",
    tone: "high",
  },
  {
    value: 74785,
    loCaption: "ຜູ້ ເສຍຫາຍ ທີ່ ຖືກ ກວດ ພົບ ໃນ ປີ 2022 — ໜ້ອຍ ກວ່າ ຄວາມ ຈິງ ຫຼາຍ",
    enCaption: "victims detected in 2022 — a fraction of the true number",
    sourceId: "glotip",
    tone: "neutral",
  },
];

/* ── Who: gender & age, as isotype pictographs ───────────────────────────── */
export const WHO_PICTOGRAPHS: {
  filled: number;
  tone: "critical" | "high";
  loTitle: string;
  enTitle: string;
  loBody: string;
  enBody: string;
  sourceId: SourceId;
}[] = [
  {
    filled: 61,
    tone: "critical",
    loTitle: "61 ໃນ 100",
    enTitle: "61 in every 100",
    loBody: "ຜູ້ ເສຍຫາຍ ທີ່ ກວດ ພົບ ແມ່ນ ຜູ້ຍິງ ແລະ ເດັກ ຍິງ",
    enBody: "detected victims are women and girls",
    sourceId: "glotip",
  },
  {
    filled: 38,
    tone: "high",
    loTitle: "38 ໃນ 100",
    enTitle: "38 in every 100",
    loBody: "ຜູ້ ເສຍຫາຍ ທີ່ ກວດ ພົບ ແມ່ນ ເດັກ",
    enBody: "detected victims are children",
    sourceId: "glotip",
  },
];

/* ── Forms of exploitation (share of detected victims, 2022) ──────────────── */
export const FORMS_OF_EXPLOITATION: {
  pct: number;
  tone: "critical" | "high" | "medium" | "low";
  lo: string;
  en: string;
}[] = [
  { pct: 42, tone: "critical", lo: "ແຮງງານ ບັງຄັບ", en: "Forced labour" },
  { pct: 36, tone: "high", lo: "ການ ຂູດຮີດ ທາງ ເພດ", en: "Sexual exploitation" },
  { pct: 8, tone: "medium", lo: "ບັງຄັບ ໃຫ້ ເຮັດ ຜິດ ກົດໝາຍ (ລວມ ການ ຫຼອກລວງ ອອນລາຍ)", en: "Forced criminality (incl. online scams)" },
  { pct: 14, tone: "low", lo: "ຮູບ ແບບ ອື່ນໆ", en: "Other forms" },
];

/** A short, sourced insight to sit beside the forms chart. */
export const FORMS_INSIGHT = {
  lo: "ແຮງງານ ບັງຄັບ ໄດ້ ເພີ່ມ ຈາກ 32% (2019) ຂຶ້ນ ເປັນ 42% (2022) — ຕອນ ນີ້ ເປັນ ຮູບ ແບບ ໃຫຍ່ ທີ່ ສຸດ. ການ ບັງຄັບ ໃຫ້ ຫຼອກລວງ ອອນລາຍ ກໍ ເພີ່ມ ຂຶ້ນ ໄວ.",
  en: "Forced labour rose from 32% (2019) to 42% (2022), overtaking sexual exploitation as the largest form. Trafficking into online-scam operations is climbing fast.",
  sourceId: "glotip" as SourceId,
};

/* ── Where: the region closest to home ────────────────────────────────────── */
export const REGION_SCALE: BigStat[] = [
  {
    value: 29.3,
    decimals: 1,
    suffix: " ລ້ານ",
    loCaption: "ຄົນ ໃນ ອາຊີ ແລະ ປາຊີຟິກ ຕົກ ຢູ່ ໃນ ການ ເປັນ ຂ້າ ທາດ ຍຸກ ໃໝ່ (59% ຂອງ ໂລກ)",
    enCaption: "in modern slavery in Asia & the Pacific — 59% of the world total",
    loQualifier: "ປະມານ",
    sourceId: "gsi",
    tone: "critical",
  },
  {
    value: 120000,
    loCaption: "ຄົນ ຖືກ ຄ້າ ເຂົ້າ ສູນ ຫຼອກລວງ ອອນລາຍ ໃນ ມຽນມາ",
    enCaption: "trafficked into scam compounds in Myanmar",
    loQualifier: "ຢ່າງໜ້ອຍ",
    sourceId: "ohchr",
    tone: "critical",
  },
  {
    value: 100000,
    loCaption: "ຄົນ ຖືກ ຄ້າ ເຂົ້າ ສູນ ຫຼອກລວງ ອອນລາຍ ໃນ ກຳປູເຈຍ",
    enCaption: "trafficked into scam compounds in Cambodia",
    loQualifier: "ປະມານ",
    sourceId: "ohchr",
    tone: "critical",
  },
];

/* ── Laos in focus ────────────────────────────────────────────────────────── */
export const LAOS_TIER = {
  current: 3,
  loLabel: "ລະດັບ 3 — ຕ່ຳ ສຸດ ໃນ ການ ຈັດ ອັນດັບ",
  enLabel: "Tier 3 — the lowest ranking",
  trajectory: [
    { year: 2023, loTier: "ລະດັບ 2", enTier: "Tier 2" },
    { year: 2024, loTier: "ລະດັບ 2 (ເຝົ້າ ລະວັງ)", enTier: "Tier 2 Watch List" },
    { year: 2025, loTier: "ລະດັບ 3", enTier: "Tier 3" },
  ],
  sourceId: "tip" as SourceId,
};

export const LAOS_FACTS: BigStat[] = [
  {
    value: 85,
    loCaption: "ຜູ້ ເສຍຫາຍ ທີ່ ລັດຖະບານ ລາວ ກວດ ພົບ ໃນ ປີ 2024 (40 ເປັນ ເດັກ ຍິງ)",
    enCaption: "victims identified by Laos in 2024 — 40 of them girls",
    sourceId: "tip",
    tone: "high",
  },
  {
    value: 477,
    loCaption: "ຄົນ ຖືກ ຊ່ວຍ ອອກ ຈາກ ເຂດ ເສດຖະກິດ ພິເສດ ສາມຫຼ່ຽມຄຳ, ແຂວງ ບໍ່ແກ້ວ",
    enCaption: "rescued from the Golden Triangle SEZ in Bokeo",
    sourceId: "rfa",
    tone: "high",
  },
];

/** Destinations of trafficked Lao nationals — qualitative, sourced. */
export const LAOS_ROUTES: { lo: string; en: string; sourceId: SourceId }[] = [
  {
    lo: "ໄທ ເປັນ ປາຍທາງ ຫຼັກ — ສ່ວນ ຫຼາຍ ເປັນ ແຮງງານ ບັງຄັບ (ຮັບໃຊ້ ໃນ ເຮືອນ, ໂຮງງານ, ກໍ່ສ້າງ, ປະມົງ).",
    en: "Thailand is the main destination — mostly forced labour: domestic work, factories, construction, fishing.",
    sourceId: "tip",
  },
  {
    lo: "ຈີນ ເປັນ ປາຍທາງ ຮອງ — ຜູ້ຍິງ ແລະ ເດັກ ຍິງ ຖືກ ຂາຍ ເປັນ ເຈົ້າສາວ ຫຼື ເຂົ້າ ສູ່ ການ ຄ້າ ປະເວນີ.",
    en: "China is a secondary destination — women and girls sold as brides or into sexual exploitation.",
    sourceId: "tip",
  },
];

/** Human note that keeps the numbers honest — trafficking is hidden, so every
 *  figure is a floor. Mirrors UNODC's own framing. */
export const HIDDEN_NOTE = {
  lo: "ການ ຄ້າ ມະນຸດ ຖືກ ເຊື່ອງ ໄວ້ — ຕົວເລກ ທຸກ ອັນ ຄື ‘ຢ່າງໜ້ອຍ’, ບໍ່ ແມ່ນ ‘ທັງ ໝົດ’. ຄວາມ ຈິງ ໃຫຍ່ ກວ່າ ນີ້.",
  en: "Trafficking is hidden by design. Every number here is a floor, not a ceiling — the truth is larger.",
};
