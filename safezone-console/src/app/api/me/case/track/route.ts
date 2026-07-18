import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser, appAuthErrorResponse } from "@/lib/app-auth";

export const dynamic = "force-dynamic";

const OPEN = ["NEW", "IN_PROGRESS"] as const;

/**
 * POST /api/me/case/track — a live GPS breadcrumb from the SafeZone app.
 *
 * While the user's SOS case is open, the app posts a fresh fix on an interval
 * (its `LiveTrackingService`). Each call appends one `CaseLocation` and copies
 * the newest lat/lng onto the parent `Case`, so every existing view — the
 * inbox, the case map, and `/api/me/guardians` — moves to the latest position
 * with no further change.
 *
 * Scoped by the *verified* phone claim, exactly like `/api/me/case`, and never
 * by any id from the request: a caller can only add points to their own case.
 *
 * ## Why DURESS cases are excluded here too
 *
 * Same rule as `/api/me/case`: the device must never learn a duress case
 * exists. In decoy mode the app never calls this at all (its tracker refuses to
 * start), but the filter is the second lock — a stream of the victim's live
 * position is the last thing to hand back to a phone an attacker is holding.
 *
 * Returns `{ open }`. `open: false` (no matching open case) tells the app to
 * stop the timer — this is how "I'm safe" from any device, or an officer
 * resolving the case, reaches the tracker and ends it.
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

  const c = await prisma.case.findFirst({
    where: {
      citizen: { phone: caller.phone },
      status: { in: [...OPEN] },
      type: { not: "DURESS" },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  // Nothing open is a normal outcome (already resolved, or the case never
  // reached the server). Report it plainly so the app stops tracking.
  if (!c) return NextResponse.json({ open: false }, { status: 200 });

  const at =
    b.occurredAt && !Number.isNaN(new Date(b.occurredAt).getTime())
      ? new Date(b.occurredAt)
      : new Date();

  // One breadcrumb + the latest position on the case, atomically. No timeline
  // event: a note per ping every 20s would bury the human-written entries the
  // officer actually reads.
  await prisma.$transaction([
    prisma.caseLocation.create({ data: { caseId: c.id, lat: b.lat, lng: b.lng, createdAt: at } }),
    prisma.case.update({ where: { id: c.id }, data: { lat: b.lat, lng: b.lng } }),
  ]);

  return NextResponse.json({ open: true }, { status: 200 });
}
