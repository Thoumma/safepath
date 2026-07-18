"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWithMinistry } from "@/lib/passport-verify";

/** Approve or reject a citizen's registration. Every decision is written to
 *  the audit log — an identity verdict with no record of who made it is not
 *  a verdict, it is an accident waiting to be litigated. */
export async function reviewCitizen(formData: FormData) {
  const staff = await requireStaff();
  // KYC is an embassy decision; partner accounts have no authority here.
  if (staff.role === "PARTNER") return;

  const citizenId = String(formData.get("citizenId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!citizenId || (decision !== "VERIFIED" && decision !== "REJECTED")) return;

  const citizen = await prisma.citizen.update({
    where: { id: citizenId },
    data: {
      kycStatus: decision,
      kycReviewedBy: staff.email,
      kycReviewedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: staff.fullName ?? staff.email,
      action: decision === "VERIFIED" ? "kyc_verify" : "kyc_reject",
      target: `${citizen.fullName} · ${citizen.passportNo}`,
    },
  });

  revalidatePath("/kyc");
  revalidatePath(`/admin/kyc/${citizen.id}`);
  revalidatePath("/logs");
  revalidatePath("/citizens");
}

/** Ask the ministry's passport API whether this registration matches a real
 *  passport. A `match` auto-verifies (and is logged as such); `no_match` is
 *  deliberately NOT an auto-reject — rejection stays a human decision. Any
 *  failure degrades to the manual flow; this button can never block KYC. */
export async function checkWithMinistry(formData: FormData) {
  const staff = await requireStaff();
  if (staff.role === "PARTNER") return;

  const citizenId = String(formData.get("citizenId") ?? "");
  if (!citizenId) return;
  const citizen = await prisma.citizen.findUnique({ where: { id: citizenId } });
  if (!citizen) return;

  const verdict = await verifyWithMinistry(citizen);

  if (verdict.status === "match") {
    await prisma.citizen.update({
      where: { id: citizenId },
      data: {
        kycStatus: "VERIFIED",
        kycReviewedBy: `MOFA API · ${staff.email}`,
        kycReviewedAt: new Date(),
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actor: staff.fullName ?? staff.email,
      action: "kyc_api_check",
      target: `${citizen.fullName} · ${citizen.passportNo}`,
      detail:
        verdict.status === "match"
          ? "match — auto-verified"
          : verdict.detail
            ? `${verdict.status} (${verdict.detail})`
            : verdict.status,
    },
  });

  revalidatePath("/kyc");
  revalidatePath(`/admin/kyc/${citizenId}`);
  revalidatePath("/logs");
  revalidatePath("/citizens");
  redirect(`/admin/kyc/${citizenId}?api=${verdict.status}`);
}
