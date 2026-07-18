import { NextResponse } from "next/server";
import { photosEnabled, uploadPhoto } from "@/lib/report-storage";

// Service-role client + Buffer must run on the Node runtime, not Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/report/photo — evidence-photo intake for suspected-trafficking
 * reports. Serves BOTH the public website and the mobile app, so there is one
 * validated ingress.
 *
 * Public and unauthenticated, exactly like `POST /api/report`: a bystander with
 * no account must be able to attach what they saw. Returns only an opaque
 * storage `path`; the photo itself is private and only signed for staff later.
 *
 * Fail-open: with no `SUPABASE_SERVICE_ROLE_KEY` configured this returns 503
 * `photos_disabled`, and clients hide the photo UI / drop the attachment while
 * the text report still goes through.
 */
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  if (!photosEnabled()) {
    return NextResponse.json({ error: "photos_disabled" }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "unsupported type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too large" }, { status: 400 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const { path } = await uploadPhoto(bytes, file.type);
    return NextResponse.json({ path }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}
