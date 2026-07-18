import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser, appAuthErrorResponse } from "@/lib/app-auth";

export const dynamic = "force-dynamic";

const OPEN = ["NEW", "IN_PROGRESS"] as const;

/**
 * The caller's own still-open case, or null.
 *
 * Scoped by the *verified* phone claim and never by an id from the request, so
 * there is no case here that the caller could ask for but does not own.
 *
 * ## Why DURESS cases are excluded — do not remove this filter
 *
 * A duress case is raised when the user is coerced into unlocking with their
 * fake password. Two things follow:
 *
 *  - The device must never be able to *clear* it. The device is the thing the
 *    attacker is holding. If the coercer got as far as the real password, an
 *    "I'm safe" button that closed the duress case would hand them the one
 *    control that undoes the silent alarm. Only a human duty officer resolves a
 *    duress case, from the console.
 *  - The device must never *show* it, either. The whole design promise is that
 *    the phone looks identical whether or not the silent alarm fired. A banner
 *    reading "you have an open emergency" is a tell, and a tell — read over the
 *    victim's shoulder — is the entire vulnerability.
 *
 * So duress cases are invisible to this route in both directions.
 */
const MINE = (phone: string) => ({
  citizen: { phone },
  status: { in: [...OPEN] },
  type: { not: "DURESS" },
});

/** GET /api/me/case — "do I have an emergency still open?" */
export async function GET(req: Request) {
  let caller;
  try {
    caller = await requireAppUser(req);
  } catch (e) {
    const res = appAuthErrorResponse(e);
    if (res) return res;
    throw e;
  }

  const c = await prisma.case.findFirst({
    where: MINE(caller.phone),
    orderBy: { createdAt: "desc" },
    include: { locations: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  return NextResponse.json(
    {
      case: c && {
        refNo: c.refNo,
        severity: c.severity,
        status: c.status,
        type: c.type,
        lat: c.lat,
        lng: c.lng,
        city: c.city,
        country: c.country,
        createdAt: c.createdAt,
        // When the last live fix landed, or null if only the opening SOS point
        // exists. Lets the app show the tracker as live and time-stamp it.
        trackedAt: c.locations[0]?.createdAt ?? null,
      },
    },
    { status: 200 }
  );
}

/**
 * POST /api/me/case — "I'm safe now."
 *
 * Resolves the caller's open case and writes it to the timeline, so the duty
 * officer sees who stood the alarm down and stops spending an evening looking
 * for someone who is already home. Without this a case stays NEW forever, and
 * everyone in `/api/me/guardians` keeps seeing the person as in-emergency.
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

  const c = await prisma.case.findFirst({
    where: MINE(caller.phone),
    orderBy: { createdAt: "desc" },
  });

  // Nothing open is a perfectly ordinary outcome — the officer may have closed
  // it first, or the user tapped twice. Report it, don't fail it.
  if (!c) return NextResponse.json({ resolved: false }, { status: 200 });

  await prisma.case.update({
    where: { id: c.id },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      events: {
        create: {
          kind: "resolve",
          message: "ຜູ້ໃຊ້ແຈ້ງວ່າປອດໄພແລ້ວ ຈາກແອັບ SafeZone",
          actor: "ຜູ້ໃຊ້",
        },
      },
    },
  });

  return NextResponse.json({ resolved: true, refNo: c.refNo }, { status: 200 });
}
