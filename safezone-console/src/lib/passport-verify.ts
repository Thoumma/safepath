import { getPassportApiConfig, passportApiReady } from "@/lib/settings";

/**
 * Client for the (future) passport-verification API of the Lao Ministry of
 * Foreign Affairs.
 *
 * The ministry has not published a contract, so this codifies our assumption:
 *   POST {url}/verify  Authorization: Bearer {key}
 *   body    { passportNo, fullName, dob? }
 *   200     { match: boolean }
 * When the real spec lands, this file is the only thing that should change.
 *
 * `unavailable` is a normal outcome, not an error — it covers "not configured
 * yet", "endpoint down" and "ministry hasn't launched the service". Callers
 * must degrade to manual KYC review, never block on it.
 */
export type MinistryVerdict = {
  status: "match" | "no_match" | "unavailable";
  detail?: string;
};

export async function verifyWithMinistry(citizen: {
  passportNo: string;
  fullName: string;
  dob?: Date | null;
}): Promise<MinistryVerdict> {
  const cfg = await getPassportApiConfig();
  if (!passportApiReady(cfg)) {
    return { status: "unavailable", detail: "not configured" };
  }

  try {
    const res = await fetch(`${cfg.url.replace(/\/+$/, "")}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify({
        passportNo: citizen.passportNo,
        fullName: citizen.fullName,
        dob: citizen.dob ? citizen.dob.toISOString().slice(0, 10) : undefined,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { status: "unavailable", detail: `HTTP ${res.status}` };

    const data = (await res.json()) as { match?: boolean };
    return data.match === true ? { status: "match" } : { status: "no_match" };
  } catch {
    return { status: "unavailable", detail: "unreachable" };
  }
}
