import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ReportSource } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/report — suspected human-trafficking report intake.
 *
 * Public and UNAUTHENTICATED by design. Unlike `/api/sos` (which requires a
 * verified phone token), the whole point of this endpoint is that a bystander
 * with no account — on the public website or in the app — can report what they
 * saw. So it must never demand identity.
 *
 * That openness is also the risk, so intake is defensive:
 *  - a hidden honeypot field (`website`) that real humans never fill; a filled
 *    one is a bot, and we ACK it with a fake ref so the bot sees success and
 *    moves on, while nothing is written;
 *  - hard length caps so a flood cannot store megabytes per request;
 *  - a fixed category allow-list.
 * Real captcha / rate-limiting is a follow-up (kept dependency-free for now).
 *
 * Body: { category, description, country?, city?, locationText?, lat?, lng?,
 *         observedAt?, reporterContact?, photoUrls?, source?, website? (honeypot) }
 */
const CATEGORIES = ["labour", "sexual", "domestic", "child", "forced_marriage", "other"];
const MAX = { description: 5000, short: 200, contact: 200 };
const MAX_PHOTOS = 3;
const MAX_PATH_LEN = 300;

export async function POST(req: Request) {
  let b: {
    category?: string;
    description?: string;
    country?: string;
    city?: string;
    locationText?: string;
    lat?: number;
    lng?: number;
    observedAt?: string;
    reporterContact?: string;
    photoUrls?: string[]; // opaque storage paths from POST /api/report/photo
    source?: ReportSource;
    website?: string; // honeypot — must stay empty
  };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // Honeypot: a filled hidden field means a bot. Return a plausible success so
  // it doesn't retry or adapt, but write nothing.
  if (b.website && b.website.trim() !== "") {
    return NextResponse.json({ refNo: "TIP-0000-0000-000" }, { status: 201 });
  }

  const category = (b.category ?? "").trim();
  const description = (b.description ?? "").trim();
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }
  if (description.length === 0) {
    return NextResponse.json({ error: "description required" }, { status: 400 });
  }
  if (description.length > MAX.description) {
    return NextResponse.json({ error: "description too long" }, { status: 400 });
  }

  const clip = (v: string | undefined, n: number) =>
    v && v.trim() !== "" ? v.trim().slice(0, n) : null;

  const observedAt =
    b.observedAt && !Number.isNaN(new Date(b.observedAt).getTime())
      ? new Date(b.observedAt)
      : null;

  const reporterContact = clip(b.reporterContact, MAX.contact);
  const source: ReportSource = b.source === "MOBILE_APP" ? "MOBILE_APP" : "PUBLIC_WEB";

  // Evidence photo paths are opaque storage keys already produced by
  // POST /api/report/photo (not free-text URLs). Cap defensively anyway.
  const photoUrls = Array.isArray(b.photoUrls)
    ? b.photoUrls
        .filter((p): p is string => typeof p === "string" && p.trim() !== "")
        .slice(0, MAX_PHOTOS)
        .map((p) => p.slice(0, MAX_PATH_LEN))
    : [];

  // Human ref number: TIP-YYYY-MMDD-NNN, sequential within the day.
  const now = new Date();
  const y = now.getFullYear();
  const md = `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const startOfDay = new Date(y, now.getMonth(), now.getDate());
  const todays = await prisma.traffikReport.count({ where: { createdAt: { gte: startOfDay } } });
  const refNo = `TIP-${y}-${md}-${String(todays + 1).padStart(3, "0")}`;

  const created = await prisma.traffikReport.create({
    data: {
      refNo,
      category,
      description,
      country: clip(b.country, MAX.short),
      city: clip(b.city, MAX.short),
      locationText: clip(b.locationText, MAX.short),
      lat: typeof b.lat === "number" ? b.lat : null,
      lng: typeof b.lng === "number" ? b.lng : null,
      observedAt,
      source,
      photoUrls,
      // Anonymous unless the reporter chose to leave a contact.
      anonymous: !reporterContact,
      reporterContact,
    },
    select: { refNo: true },
  });

  return NextResponse.json({ refNo: created.refNo }, { status: 201 });
}
