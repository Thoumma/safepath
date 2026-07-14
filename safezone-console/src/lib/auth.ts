import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Prisma, StaffUser } from "@prisma/client";

/** Resolve the logged-in staff member, or redirect to /login. */
export async function requireStaff(): Promise<StaffUser> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let staff = await prisma.staffUser.findUnique({ where: { id: user.id } });

  // First login for a known auth user without a staff row → create a default
  // OFFICER so the demo is usable; tighten in staff_setup.sql.
  if (!staff) {
    staff = await prisma.staffUser.create({
      data: { id: user.id, email: user.email ?? "unknown", role: "OFFICER" },
    });
  }
  return staff;
}

/**
 * Build the Prisma `where` scope for a staff member. PARTNER roles only see
 * cases routed to their partner; ADMIN/OFFICER see everything.
 */
export function caseScope(staff: StaffUser): Prisma.CaseWhereInput {
  if (staff.role === "PARTNER" && staff.partnerCode) {
    return { routedTo: staff.partnerCode };
  }
  return {};
}
