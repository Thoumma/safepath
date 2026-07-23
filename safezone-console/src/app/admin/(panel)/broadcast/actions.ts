"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastSms, smsMode } from "@/lib/sms";

/** A single SMS segment is 160 GSM chars / 70 for non-Latin (Lao). Lao alerts
 *  are multi-segment by nature, so we cap generously but bound cost/abuse. */
const MAX_LEN = 480;

/**
 * Send an SMS alert to every registered citizen who has a phone number.
 *
 * Embassy-only (an all-users blast is not a PARTNER's authority). Requires an
 * explicit confirm checkbox — this is loud, costs money, and cannot be
 * unsent. Every send is audit-logged with who, how many, and which mode, so
 * the Activity Log shows exactly what went out. It can only reach numbers in
 * our own database; there is no "all of Laos" here and cannot be.
 */
export async function sendBroadcast(formData: FormData) {
  const staff = await requireStaff();
  if (staff.role === "PARTNER") redirect("/admin");

  const message = String(formData.get("message") ?? "").trim();
  const confirmed = formData.get("confirm") === "on";

  if (!message) redirect("/admin/broadcast?b=empty");
  if (message.length > MAX_LEN) redirect("/admin/broadcast?b=toolong");
  if (!confirmed) redirect("/admin/broadcast?b=unconfirmed");

  if (smsMode() === "off") redirect("/admin/broadcast?b=noprovider");

  // Pull every reachable number. `phone` is nullable, so filter it out; a blank
  // string can never have been written (the app sends E.164), but guard anyway.
  const citizens = await prisma.citizen.findMany({
    where: { phone: { not: null } },
    select: { phone: true },
  });
  const numbers = citizens
    .map((c) => c.phone!)
    .filter((p) => p.trim().length > 0);

  if (numbers.length === 0) redirect("/admin/broadcast?b=norecipients");

  const result = await broadcastSms(numbers, message);

  await prisma.auditLog.create({
    data: {
      actor: staff.fullName ?? staff.email,
      action: "broadcast",
      target: `${result.sent}/${numbers.length} recipients`,
      // Log what went out, in which mode, and how it landed — never trim the
      // message here; the Activity Log is the record of what staff broadcast.
      detail: `mode=${result.mode} sent=${result.sent} failed=${result.failed} · ${message}`,
    },
  });

  revalidatePath("/admin/broadcast");
  revalidatePath("/admin/logs");
  redirect(
    `/admin/broadcast?b=sent&mode=${result.mode}&n=${result.sent}&fail=${result.failed}`
  );
}
