import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Prisma, StaffUser } from "@prisma/client";

/** Resolve the logged-in staff member, or redirect to /login.
 *
 * Wrapped in React `cache()` so that when the layout and a page both call it
 * in the same request, the Supabase `getUser()` round trip and the staff-row
 * query run once, not once per caller.
 */
export const requireStaff = cache(async (): Promise<StaffUser> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  let staff = await prisma.staffUser.findUnique({ where: { id: user.id } });

  // First login for a known auth user without a staff row → create a default
  // OFFICER so the demo is usable; tighten in staff_setup.sql.
  if (!staff) {
    staff = await prisma.staffUser.create({
      data: { id: user.id, email: user.email ?? "unknown", role: "OFFICER" },
    });
  }
  return staff;
});

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
