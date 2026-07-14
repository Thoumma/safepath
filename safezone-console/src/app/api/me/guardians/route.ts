import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser, appAuthErrorResponse } from "@/lib/app-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/guardians — "who made me their emergency contact?"
 *
 * The reverse of the trusted-contact edge: every citizen whose trusted_contacts
 * list holds the caller's phone number. For each, we also report whether they
 * currently have an open case, so the app can show "safe" or "in emergency"
 * with a last known location.
 *
 * ## Why this route is dangerous, and what makes it safe
 *
 * This is a social-graph query. Answered for a number the caller merely
 * *claimed*, it would let anyone type a stranger's number and learn who depends
 * on that person, that those people are travelling abroad, and — via the open
 * case — exactly where they are right now.
 *
 * It is safe only because `requireAppUser` refuses any token without a `phone`
 * claim, and Supabase issues that claim only after a real SMS round-trip. We
 * look up by the *verified* number and never by anything in the request.
 */
export async function GET(req: Request) {
  let caller;
  try {
    caller = await requireAppUser(req);
  } catch (e) {
    const res = appAuthErrorResponse(e);
    if (res) return res;
    throw e;
  }

  const edges = await prisma.trustedContact.findMany({
    where: { phone: caller.phone },
    include: {
      citizen: {
        include: {
          cases: {
            where: { status: { in: ["NEW", "IN_PROGRESS"] } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const guardians = edges.map((e) => {
    const openCase = e.citizen.cases[0];
    return {
      citizenId: e.citizen.id,
      fullName: e.citizen.fullName,
      phone: e.citizen.phone,
      relation: e.relation,
      inEmergency: !!openCase,
      case: openCase
        ? {
            refNo: openCase.refNo,
            severity: openCase.severity,
            status: openCase.status,
            type: openCase.type,
            lat: openCase.lat,
            lng: openCase.lng,
            city: openCase.city,
            country: openCase.country,
            createdAt: openCase.createdAt,
          }
        : null,
    };
  });

  // Someone in trouble sorts above someone who is safe. This list is read in a
  // hurry or not at all.
  guardians.sort((a, b) => Number(b.inEmergency) - Number(a.inEmergency));

  return NextResponse.json({ guardians }, { status: 200 });
}
