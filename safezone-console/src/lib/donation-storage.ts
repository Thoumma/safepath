import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * QR-image storage for the public donation page (item #14).
 *
 * Unlike report evidence (which is private, staff-only, signed — see
 * report-storage.ts), a donation QR is meant to be *shown to everyone*: a
 * visitor scans it to give. So it lives in a PUBLIC bucket and the public page
 * renders its stable URL directly — no signing, no expiry.
 *
 * Uploads still need the service-role key (only staff, server-side, set the QR),
 * so `donationStorageEnabled()` gates the upload UI. Reads never need it: once a
 * QR is stored, the public URL keeps working even if the key is later removed.
 */

/** The public bucket that holds the donation QR. Auto-created on first upload. */
const BUCKET = "donation-assets";

/** True when server-side QR upload is configured (service-role key present). */
export function donationStorageEnabled(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/** A service-role client. Server-side only; never expose it or its key. */
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
 * Uploads the donation QR and returns its storage path. The bucket is created
 * lazily (public) on first use. A random name so a replaced QR never collides
 * with a cached old one.
 */
export async function uploadQr(
  bytes: Uint8Array | Buffer,
  contentType: string
): Promise<{ path: string }> {
  const supabase = serviceClient();

  // Ensure the public bucket exists. Ignore the "already exists" race.
  const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (bucketErr && !/exist/i.test(bucketErr.message)) {
    throw new Error(`bucket: ${bucketErr.message}`);
  }

  const ext = EXT[contentType] ?? "bin";
  const path = `qr/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`upload: ${error.message}`);

  return { path };
}

/** Best-effort delete of a previous QR when it is replaced or cleared. */
export async function deleteQr(path: string): Promise<void> {
  if (!path) return;
  try {
    await serviceClient().storage.from(BUCKET).remove([path]);
  } catch {
    // A leftover object is harmless — never let cleanup fail the save.
  }
}

/**
 * The public URL for a stored QR path. Stable and cacheable; safe to render on
 * the public site. Returns "" for an empty path or when storage is unconfigured.
 */
export function qrPublicUrl(path: string): string {
  if (!path || !process.env.NEXT_PUBLIC_SUPABASE_URL) return "";
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}
