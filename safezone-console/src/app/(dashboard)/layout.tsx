import { AppSidebar } from "@/components/app-sidebar";
import { requireStaff, caseScope } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PARTNER } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const newCount = await prisma.case.count({ where: { ...caseScope(staff), status: "NEW" } });

  const scopeLabel =
    staff.role === "PARTNER" && staff.partnerCode
      ? `${PARTNER[staff.partnerCode].lo} · ${PARTNER[staff.partnerCode].en}`
      : "ສະຖານທູດ ລາວ · Bangkok";

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar staffName={staff.fullName ?? staff.email} scopeLabel={scopeLabel} newCount={newCount} />
      {/* pb-14 clears the mobile bottom tab bar; it collapses at md. */}
      <main className="flex-1 overflow-y-auto pb-14 md:pb-0">{children}</main>
    </div>
  );
}
