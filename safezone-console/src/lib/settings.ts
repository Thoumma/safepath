import { prisma } from "@/lib/prisma";

/**
 * Passport-verification API of the Lao Ministry of Foreign Affairs.
 *
 * The ministry has not published the service yet — these settings exist so
 * the console is ready the day it does: staff paste the key and URL in
 * /settings and flip the toggle; no redeploy. Until then (or whenever the
 * check is disabled/unreachable) KYC falls back to the manual review flow,
 * which never depends on any of this.
 */
export const PASSPORT_API_KEYS = {
  enabled: "passport_api_enabled",
  url: "passport_api_url",
  key: "passport_api_key",
} as const;

export type PassportApiConfig = {
  enabled: boolean;
  url: string;
  /** The secret itself — server-side only, never render or return it. */
  key: string;
};

export async function getPassportApiConfig(): Promise<PassportApiConfig> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: Object.values(PASSPORT_API_KEYS) } },
  });
  const get = (k: string) => rows.find((r) => r.key === k)?.value ?? "";
  return {
    enabled: get(PASSPORT_API_KEYS.enabled) === "true",
    url: get(PASSPORT_API_KEYS.url),
    key: get(PASSPORT_API_KEYS.key),
  };
}

/** True when the ministry check can actually be attempted. */
export function passportApiReady(cfg: PassportApiConfig): boolean {
  return cfg.enabled && cfg.url !== "" && cfg.key !== "";
}

export async function setSetting(key: string, value: string, updatedBy: string) {
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value, updatedBy },
    update: { value, updatedBy },
  });
}

/**
 * Donation configuration for the public website (item #14).
 *
 * Staff turn donations on and fill the details in /admin/settings — a link, a
 * bank account, and/or a QR image — exactly like the passport-API config above:
 * `system_settings` rows, audit-logged, no redeploy. None of it is secret: it is
 * meant to be shown publicly. `donationReady()` is the fail-open gate — the
 * public /donate page and the nav/footer links stay hidden until donations are
 * both enabled AND have at least one payable detail.
 */
export const DONATION_KEYS = {
  enabled: "donation_enabled",
  titleLo: "donation_title_lo",
  titleEn: "donation_title_en",
  blurbLo: "donation_blurb_lo",
  blurbEn: "donation_blurb_en",
  url: "donation_url",
  bank: "donation_bank",
  qrPath: "donation_qr_path",
} as const;

export type DonationConfig = {
  enabled: boolean;
  titleLo: string;
  titleEn: string;
  blurbLo: string;
  blurbEn: string;
  url: string;
  /** Free-text bank / account details, shown verbatim (may be multi-line). */
  bank: string;
  /** Storage path of the QR image in the public donation bucket, "" if none. */
  qrPath: string;
};

/**
 * Built-in donation content, shipped as static assets under `public/donation/`.
 * These amount-preset QR codes (BCEL One) let the /donate page work out of the
 * box — before any staff upload — which is why donations default to ON. A staff
 * member can still override with a custom QR/link/bank or switch donations off
 * entirely in /admin/settings. Amounts are in Lao kip (LAK).
 */
export const DONATION_PRESET_QRS = [
  { lak: 10000, img: "/donation/10000.jpeg" },
  { lak: 20000, img: "/donation/20000.jpeg" },
  { lak: 50000, img: "/donation/50000.jpeg" },
  { lak: 1000000, img: "/donation/1000000.jpeg" },
] as const;

/** Default Lao-first copy used when staff have not set their own. */
export const DONATION_DEFAULTS = {
  titleLo: "ຮ່ວມບໍລິຈາກ ສະໜັບສະໜູນ SafeZone",
  titleEn: "Support SafeZone",
  blurbLo:
    "ການບໍລິຈາກ ຂອງ ທ່ານ ຊ່ວຍ ໃຫ້ ພວກເຮົາ ປົກປ້ອງ ຄົນລາວ ຈາກ ການຄ້າມະນຸດ. ສະແກນ QR ດ້ານລຸ່ມ ເພື່ອ ບໍລິຈາກ.",
  blurbEn:
    "Your donation helps us protect Lao travellers from trafficking. Scan a QR below to give.",
} as const;

export async function getDonationConfig(): Promise<DonationConfig> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: Object.values(DONATION_KEYS) } },
  });
  const raw = (k: string) => rows.find((r) => r.key === k)?.value;
  const get = (k: string) => raw(k) ?? "";
  return {
    // Default ON: donations show the built-in preset QRs until a staff member
    // explicitly turns them off. Only an explicit "false" hides them.
    enabled: raw(DONATION_KEYS.enabled) !== "false",
    titleLo: get(DONATION_KEYS.titleLo),
    titleEn: get(DONATION_KEYS.titleEn),
    blurbLo: get(DONATION_KEYS.blurbLo),
    blurbEn: get(DONATION_KEYS.blurbEn),
    url: get(DONATION_KEYS.url),
    bank: get(DONATION_KEYS.bank),
    qrPath: get(DONATION_KEYS.qrPath),
  };
}

/**
 * True when the public donation UI should appear. Fail-open: an explicit
 * disable hides everything. Otherwise there is always something to show — a
 * custom QR/link/bank if configured, or the built-in preset QRs as a fallback.
 */
export function donationReady(cfg: DonationConfig): boolean {
  return cfg.enabled;
}
