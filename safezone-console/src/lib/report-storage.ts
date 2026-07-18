import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Private photo storage for suspected-trafficking reports (Phase 6b).
 *
 * Evidence photos are sensitive: they may show victims, faces, or a location
 * that puts a reporter at risk. So they are NEVER public. They live in a private
 * Supabase Storage bucket, uploaded server-side with the service-role key, and
 * are only ever shown to authenticated staff through short-lived signed URLs.
 * The `POST /api/report` payload and the DB store only opaque storage *paths*,
 * never a fetchable URL.
 *
 * Fail-open by design: if `SUPABASE_SERVICE_ROLE_KEY` is not configured, photo
 * handling is simply disabled — the report flow stays text-only and nothing
 * breaks. `photosEnabled()` is the single gate every caller checks first.
 */

/** The private bucket that holds report evidence. Auto-created on first upload. */
const BUCKET = "report-photos";

/** True when server-side photo handling is configured. The one fail-open gate. */
export function photosEnabled(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/**
 * A service-role client. Bypasses RLS — only ever built server-side, only when
 * `photosEnabled()`. Never expose this or its key to the browser or the app.
 */
function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Uploads one evidence photo and returns its storage path. The bucket is created
 * lazily (private) on first use so there is no manual dashboard step. Paths are
 * date-sharded random names — they carry no reporter identity.
 */
export async function uploadPhoto(
  bytes: Uint8Array | Buffer,
  contentType: string
): Promise<{ path: string }> {
  const supabase = serviceClient();

  // Ensure the private bucket exists. Ignore the "already exists" race.
  const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, { public: false });
  if (bucketErr && !/exist/i.test(bucketErr.message)) {
    throw new Error(`bucket: ${bucketErr.message}`);
  }

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const ext = EXT[contentType] ?? "bin";
  const path = `${yyyy}/${mm}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`upload: ${error.message}`);

  return { path };
}

/**
 * Signs a storage path for staff viewing. Short-lived (10 min default) so a
 * leaked URL expires quickly. Returns null on any error so a broken/expired path
 * never throws the triage page — it just shows no thumbnail.
 */
export async function signedUrl(path: string, expiresInSec = 600): Promise<string | null> {
  try {
    const supabase = serviceClient();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSec);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
