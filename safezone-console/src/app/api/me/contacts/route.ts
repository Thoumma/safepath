import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser, appAuthErrorResponse } from "@/lib/app-auth";

export const dynamic = "force-dynamic";

type IncomingContact = { name: string; phone: string; email?: string; relation?: string };

/**
 * PUT /api/me/contacts — replace the caller's trusted-contact set.
 *
 * Whole-set replace rather than an incremental diff: a partially-synced
 * emergency contact list is worse than a late one, and replace is idempotent,
 * so the app can safely retry it after being offline.
 *
 * This is also what makes the Guardian tab possible — it is the only way a
 * "B is an emergency contact of A" edge ever reaches the server.
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

  const b = (await req.json()) as { passportNo?: string; contacts?: IncomingContact[] };
  if (!b.passportNo) return NextResponse.json({ error: "passportNo required" }, { status: 400 });

  const citizen = await prisma.citizen.findUnique({ where: { passportNo: b.passportNo } });
  if (!citizen) return NextResponse.json({ error: "profile not synced yet" }, { status: 409 });

  // Guard against a caller replacing someone else's contacts by claiming their
  // passport number. The citizen must be the one this verified phone owns.
  if (citizen.phone !== caller.phone) {
    return NextResponse.json({ error: "passport does not belong to caller" }, { status: 403 });
  }

  const contacts = (b.contacts ?? []).filter((c) => c.name && c.phone);

  await prisma.$transaction([
    prisma.trustedContact.deleteMany({ where: { citizenId: citizen.id } }),
    prisma.trustedContact.createMany({
      data: contacts.map((c, i) => ({
        citizenId: citizen.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        relation: c.relation,
        isPrimary: i === 0,
      })),
    }),
  ]);

  return NextResponse.json({ count: contacts.length }, { status: 200 });
}
