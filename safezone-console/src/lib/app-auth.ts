import { createClient } from "@supabase/supabase-js";

/**
 * Authenticates a request coming from the SafeZone **mobile app** (not a staff
 * browser session — that's `lib/supabase/server.ts` + middleware).
 *
 * The app sends the Supabase access token it received after verifying its phone
 * by SMS. We hand that token back to Supabase, which validates the signature and
 * returns the user — including the `phone` claim it only issues after a real
 * SMS round-trip.
 *
 * That claim is the whole security model for `/api/me/*`. It is the difference
 * between "the number this caller *says* is theirs" and "the number Supabase
 * watched them prove they control". The reverse lookup in `/api/me/guardians`
 * ("who listed my number as their emergency contact?") is a social-graph query:
 * served on a self-declared number, anyone could type a stranger's number and
 * learn who depends on them and where those people are. So it is served only on
 * a verified one.
 *
 * This replaces the old `SOS_INGEST_TOKEN` shared bearer, which was a secret
 * compiled into a shipped APK — i.e. not a secret. Anyone could extract it and
 * forge cases into the embassy's inbox.
 */
export type AppUser = {
  /** The Supabase auth user id. */
  id: string;
  /** E.164, verified by SMS. Never null — that's the point of this type. */
  phone: string;
};

export class AppAuthError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export async function requireAppUser(req: Request): Promise<AppUser> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new AppAuthError(401, "missing bearer token");
  }
  const token = header.slice("Bearer ".length);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new AppAuthError(401, "invalid token");
  }

  const phone = data.user.phone;
  if (!phone) {
    // A session with no phone claim never completed SMS verification. Refuse:
    // everything downstream keys on a *proven* number.
    throw new AppAuthError(403, "phone not verified");
  }

  return { id: data.user.id, phone: phone.startsWith("+") ? phone : `+${phone}` };
}

/** Maps an AppAuthError to a Response; rethrows anything unexpected. */
export function appAuthErrorResponse(e: unknown): Response | null {
  if (e instanceof AppAuthError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  return null;
}
