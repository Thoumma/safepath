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
