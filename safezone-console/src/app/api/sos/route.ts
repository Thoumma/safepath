import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser, appAuthErrorResponse } from "@/lib/app-auth";
import type { PartnerType, Severity } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/sos — SOS intake called by the SafeZone mobile app.
 *
 * Authenticated by the caller's Supabase access token, whose `phone` claim was
 * issued only after a real SMS verification (see `lib/app-auth.ts`). The case
 * therefore provably belongs to a real, phone-verified human.
 *
 * Body: { passportNo, fullName?, lat?, lng?, mapsUrl?, city?, country?,
 *         type?, severity?, routedTo?, duress? }
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

  const b = (await req.json()) as {
    passportNo?: string;
    fullName?: string;
    type?: string;
    severity?: Severity;
    lat?: number;
    lng?: number;
    mapsUrl?: string;
    city?: string;
    country?: string;
    routedTo?: PartnerType;
    duress?: boolean;
    occurredAt?: string;
  };

  if (!b.passportNo) return NextResponse.json({ error: "passportNo required" }, { status: 400 });

  // The phone comes from the verified token, never from the body — a caller
  // must not be able to file a case under someone else's number.
  const phone = caller.phone;

  const citizen = await prisma.citizen.upsert({
    where: { passportNo: b.passportNo },
    update: { ...(b.fullName ? { fullName: b.fullName } : {}), phone },
    create: { passportNo: b.passportNo, fullName: b.fullName ?? b.passportNo, phone },
  });

  // Generate a human ref number: SOS-YYYY-MMDD-NNN
  const now = new Date();
  const y = now.getFullYear();
  const md = `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const startOfDay = new Date(y, now.getMonth(), now.getDate());
  const todays = await prisma.case.count({ where: { createdAt: { gte: startOfDay } } });
  const refNo = `SOS-${y}-${md}-${String(todays + 1).padStart(3, "0")}`;

  const routedTo = b.routedTo ?? "EMBASSY";
  const partner = await prisma.partner.findUnique({ where: { code: routedTo } });

  // A duress alert means the user was coerced into unlocking their phone and
  // entered their fake password. They cannot speak, and the attacker is holding
  // the device. That is the most severe thing this system can hear — always
  // CRITICAL, regardless of what the client asked for.
  const duress = b.duress === true;
  const severity: Severity = duress ? "CRITICAL" : (b.severity ?? "HIGH");

  // The app holds an SOS in its outbox when the phone has no signal and delivers
  // it on reconnect, so `now` is when we *heard* about the emergency, not when
  // it happened. The gap can be hours.
  //
  // `createdAt` still means "when the console learned of it" — the inbox is
  // ordered newest-first, and back-dating a case would file it below cases the
  // officer has already worked, which is how a delayed emergency gets missed
  // entirely. Instead the delay is stated on the timeline, where it is read.
  // A stale GPS fix presented as a live one sends the rescue to where the person
  // used to be, so this must never be silent.
  const occurredAt = b.occurredAt ? new Date(b.occurredAt) : null;
  const delayMs =
    occurredAt && !Number.isNaN(occurredAt.getTime())
      ? now.getTime() - occurredAt.getTime()
      : 0;
  const delayed = delayMs > 60_000;
  const delayNote = delayed
    ? ` (ສົ່ງຊ້າ ${Math.round(delayMs / 60000)} ນາທີ — ຕອນນັ້ນບໍ່ມີສັນຍານ; ຕຳແໜ່ງນີ້ແມ່ນຕອນ ${occurredAt!.toISOString()})`
    : "";

  const created = await prisma.case.create({
    data: {
      refNo,
      citizenId: citizen.id,
      severity,
      status: "NEW",
      type: duress ? "DURESS" : (b.type ?? "SOS"),
      city: b.city,
      country: b.country,
      lat: b.lat,
      lng: b.lng,
      routedTo,
      partnerId: partner?.id,
      // The timeline is the audit record of an emergency. `kind` carries the
      // semantics; the UI renders the marker. No emoji in the data.
      events: {
        create: {
          kind: duress ? "duress" : "sos",
          message:
            (duress
              ? "ໃສ່ລະຫັດປອມ (ຖືກບັງຄັບ) — ຜູ້ໃຊ້ອາດເວົ້າບໍ່ໄດ້"
              : "ກົດ SOS ຈາກ ແອັບ SafeZone") + delayNote,
          actor: "ອຸປະກອນ",
        },
      },
    },
  });

  return NextResponse.json({ id: created.id, refNo: created.refNo }, { status: 201 });
}
