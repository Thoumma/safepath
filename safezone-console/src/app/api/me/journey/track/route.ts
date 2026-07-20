import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser, appAuthErrorResponse } from "@/lib/app-auth";

export const dynamic = "force-dynamic";

/** How much trail a citizen keeps. A journey is a live picture, not an
 *  archive — pruning on every insert keeps the table honest with the promise
 *  the app makes ("your contacts see where you are", not "…everywhere you
 *  have ever been"). */
const RETENTION_HOURS = 12;

/**
 * POST /api/me/journey/track — a journey-sharing GPS breadcrumb.
 *
 * The sibling of `/api/me/case/track`, for the routine (non-emergency)
 * journey stream: appends one `JourneyLocation`, mirrors the newest fix onto
 * the citizen, and prunes anything older than the retention window.
 *
 * A breadcrumb arriving also (re)asserts `journeySharing: true` — the device
 * is the source of truth for the toggle, and a device that toggled on while
 * offline (its PUT lost) self-heals with its first successful ping.
 *
 * Returns `{ sharing }`. `sharing: false` (no citizen profile) tells the app
 * to stop posting until a profile exists.
 */
export async function POST(req: Request) {
  let caller;
  try {
    caller = await requireAppUser(req);
  } catch (e) {
    const res = appAuthErrorResponse(e);
    if (res) return res;
    throw e;
  }

  const b = (await req.json()) as { lat?: number; lng?: number; occurredAt?: string };
  if (typeof b.lat !== "number" || typeof b.lng !== "number") {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const citizen = await prisma.citizen.findFirst({
    where: { phone: caller.phone },
    select: { id: true },
  });
  if (!citizen) return NextResponse.json({ sharing: false }, { status: 200 });

  const at =
    b.occurredAt && !Number.isNaN(new Date(b.occurredAt).getTime())
      ? new Date(b.occurredAt)
      : new Date();
  const pruneBefore = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.journeyLocation.create({
      data: { citizenId: citizen.id, lat: b.lat, lng: b.lng, createdAt: at },
    }),
    prisma.citizen.update({
      where: { id: citizen.id },
      data: {
        journeySharing: true,
        journeyLat: b.lat,
        journeyLng: b.lng,
        lastJourneyAt: at,
      },
    }),
    prisma.journeyLocation.deleteMany({
      where: { citizenId: citizen.id, createdAt: { lt: pruneBefore } },
    }),
  ]);

  return NextResponse.json({ sharing: true }, { status: 200 });
}
