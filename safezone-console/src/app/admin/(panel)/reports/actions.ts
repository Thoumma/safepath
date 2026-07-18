"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import type { ReportStatus } from "@prisma/client";

const STATUSES: ReportStatus[] = ["NEW", "REVIEWING", "ACTIONED", "DISMISSED"];

/**
 * Triage a trafficking report: set its status and (optionally) a review note.
 * Staff-only — `requireStaff` redirects an unauthenticated caller to the login.
 */
export async function updateReport(formData: FormData) {
  const staff = await requireStaff();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ReportStatus;
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();

  if (!id || !STATUSES.includes(status)) return;

  await prisma.traffikReport.update({
    where: { id },
    data: {
      status,
      reviewNote: reviewNote || null,
      reviewedBy: staff.fullName ?? staff.email,
    },
  });

  revalidatePath("/admin/reports");
}
