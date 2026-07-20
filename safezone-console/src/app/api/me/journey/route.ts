import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser, appAuthErrorResponse } from "@/lib/app-auth";

export const dynamic = "force-dynamic";

/**
 * PUT /api/me/journey — switch journey sharing on or off.
 *
 * Journey sharing is the routine, opt-in counterpart of SOS live tracking:
 * "let my trusted contacts watch me while I travel". The app persists the
 * user's choice locally and mirrors it here so the guardians endpoint and the
 * console live map know whether to show the trail.
 *
 * Scoped by the *verified* phone claim, like every `/api/me/*` route — a
 * caller can only ever toggle their own sharing.
 *
 * Turning sharing OFF deletes the whole breadcrumb trail, not just the flag.
 * "Stop sharing" must mean the history is gone too; keeping a trail the user
 * believes they retracted would betray the promise the toggle makes.
 */
export async function PUT(req: Request) {
  let caller;
  try {
    caller = await requireAppUser(req);
  } catch (e) {
    const res = appAuthErrorResponse(e);
    if (res) return res;
    throw e;
  }

  const b = (await req.json()) as { sharing?: boolean };
  if (typeof b.sharing !== "boolean") {
    return NextResponse.json({ error: "sharing (boolean) required" }, { status: 400 });
  }

  const citizen = await prisma.citizen.findFirst({
    where: { phone: caller.phone },
    select: { id: true },
  });

  // No profile synced yet is a normal outcome (verified phone, profile PUT
  // still pending). Report sharing as off; the app retries after profile sync.
  if (!citizen) return NextResponse.json({ sharing: false }, { status: 200 });

  if (b.sharing) {
    await prisma.citizen.update({
      where: { id: citizen.id },
      data: { journeySharing: true },
    });
  } else {
    await prisma.$transaction([
      prisma.citizen.update({
        where: { id: citizen.id },
        data: {
          journeySharing: false,
          journeyLat: null,
          journeyLng: null,
          lastJourneyAt: null,
        },
      }),
      prisma.journeyLocation.deleteMany({ where: { citizenId: citizen.id } }),
    ]);
  }

  return NextResponse.json({ sharing: b.sharing }, { status: 200 });
}
