"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  revalidatePath("/logs");
  revalidatePath("/citizens");
}
