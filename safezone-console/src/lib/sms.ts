// Server-side SMS sender for staff broadcasts.
//
// The console can push an SMS alert to every registered citizen (a storm
// warning, a border closure, a scam alert). That needs a real SMS provider —
// the same missing piece that blocks phone verification. This wraps one
// (Twilio) behind a small interface so the rest of the app never touches the
// provider directly, and degrades honestly when none is configured.
//
// Three states, decided entirely by environment (never the DB — these are
// secrets, and they belong in Vercel's env, not a system_settings row a
// browser could read):
//
//   - configured   → TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM set;
//                     real SMS go out.
//   - test mode     → SMS_TEST_MODE=1; nothing is sent, every recipient is
//                     reported as "sent" so the whole flow can be demoed
//                     without an account (mirrors the app's TEST_MODE).
//   - not configured→ neither; a broadcast is refused, not silently dropped.
//
// It can only ever reach numbers already in our database — there is no way to
// SMS "every phone in Laos". That is cell broadcast, run by the carriers and
// the government, not something any app can originate.

export type SmsMode = "live" | "test" | "off";

export function smsMode(): SmsMode {
  if (process.env.SMS_TEST_MODE === "1") return "test";
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM
  ) {
    return "live";
  }
  return "off";
}

/** True when a broadcast will actually do something (send or simulate). */
export function smsReady(): boolean {
  return smsMode() !== "off";
}

/** Sends one SMS through Twilio. Throws on a provider error so the caller can
 *  count it as a failure. Never called in test/off mode. */
async function sendOne(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM!;

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
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
  const mode = smsMode();
  if (mode === "off") return { mode, sent: 0, failed: 0 };
  if (mode === "test") return { mode, sent: recipients.length, failed: 0 };

  let sent = 0;
  let failed = 0;
  const BATCH = 10;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((to) => sendOne(to, body))
    );
    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else failed++;
    }
  }
  return { mode, sent, failed };
}
