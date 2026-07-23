// Server-side SMS sender for staff broadcasts.
//
// The console can push an SMS alert to every registered citizen (a storm
// warning, a border closure, a scam alert). That needs a real SMS provider —
// the same missing piece that blocks phone verification. This wraps one
// (Twilio) behind a small interface so the rest of the app never touches the
// provider directly, and degrades honestly when none is configured.
//
// Three states:
//
//   - test  → SMS_TEST_MODE=1 (env). Nothing is sent; every recipient is
//             reported as "sent" so the whole flow can be demoed without an
//             account (mirrors the app's TEST_MODE). This is the hackathon path.
//   - live  → a provider is configured AND enabled in /admin/settings (stored
//             in system_settings, token write-only). Real SMS go out.
//   - off   → neither. A broadcast is refused, not silently dropped.
//
// Provider credentials live in the admin settings (like the passport-API key),
// not env, so staff can add them the day the embassy signs up — no redeploy.
//
// It can only ever reach numbers already in our database — there is no way to
// SMS "every phone in Laos". That is cell broadcast, run by the carriers and
// the government, not something any app can originate.

import { getSmsConfig, smsConfigReady, type SmsConfig } from "@/lib/settings";

export type SmsMode = "live" | "test" | "off";

/** Resolve what a broadcast will actually do right now. Test mode (env) wins,
 *  so a demo never accidentally sends through a half-configured provider. */
export async function smsMode(): Promise<SmsMode> {
  if (process.env.SMS_TEST_MODE === "1") return "test";
  const cfg = await getSmsConfig();
  return smsConfigReady(cfg) ? "live" : "off";
}

/** Sends one SMS through Twilio. Throws on a provider error so the caller can
 *  count it as a failure. Only called in live mode, with a ready config. */
async function sendOne(cfg: SmsConfig, to: string, body: string): Promise<void> {
  const auth = Buffer.from(`${cfg.sid}:${cfg.token}`).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: cfg.from, Body: body }).toString(),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`twilio ${res.status}: ${detail.slice(0, 200)}`);
  }
}

export type BroadcastResult = {
  mode: SmsMode;
  /** Numbers we attempted (test mode counts as attempted). */
  sent: number;
  /** Numbers the provider rejected. */
  failed: number;
};

/**
 * Sends [body] to every number in [recipients]. In test mode nothing leaves
 * the server but every number is counted as sent. In off mode it returns
 * zeros with mode "off" — the caller must check and refuse before claiming a
 * send happened. Sends in small concurrent batches so one slow number does
 * not stall the whole run, and so we never open thousands of sockets at once.
 */
export async function broadcastSms(
  recipients: string[],
  body: string
): Promise<BroadcastResult> {
  const mode = await smsMode();
  if (mode === "off") return { mode, sent: 0, failed: 0 };
  if (mode === "test") return { mode, sent: recipients.length, failed: 0 };

  const cfg = await getSmsConfig();
  let sent = 0;
  let failed = 0;
  const BATCH = 10;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((to) => sendOne(cfg, to, body))
    );
    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else failed++;
    }
  }
  return { mode, sent, failed };
}
