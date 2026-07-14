import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser, appAuthErrorResponse } from "@/lib/app-auth";

export const dynamic = "force-dynamic";

/**
 * PUT /api/me/profile — the app pushes its Citizen identity up.
 *
 * Called once the user has filled in a profile and verified their phone. Until
 * this lands, an SOS from the app has no citizen to attach to and the duty
 * officer would be looking at an anonymous device id.
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

  const b = (await req.json()) as {
    passportNo?: string;
    fullName?: string;
    homeProvince?: string;
  };

  if (!b.passportNo || !b.fullName) {
    return NextResponse.json({ error: "passportNo and fullName required" }, { status: 400 });
  }

  // Phone always comes from the verified token, never the body.
  const citizen = await prisma.citizen.upsert({
    where: { passportNo: b.passportNo },
    update: { fullName: b.fullName, phone: caller.phone, homeProvince: b.homeProvince },
    create: {
      passportNo: b.passportNo,
      fullName: b.fullName,
      phone: caller.phone,
      homeProvince: b.homeProvince,
    },
  });

  return NextResponse.json({ id: citizen.id }, { status: 200 });
}
