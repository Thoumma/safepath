import { PageHeader } from "@/components/page-header";
import { StatBlock } from "@/components/stat-card";
import { ReportsCharts } from "@/components/reports-charts";
import { requireStaff, caseScope } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const staff = await requireStaff();
  const scope = caseScope(staff);

  const [total, resolved, byTypeRaw, byCountryRaw] = await Promise.all([
    prisma.case.count({ where: scope }),
    prisma.case.count({ where: { ...scope, status: "RESOLVED" } }),
    prisma.case.groupBy({ by: ["type"], where: scope, _count: true }),
    prisma.case.groupBy({ by: ["country"], where: scope, _count: true }),
  ]);

  const byType = byTypeRaw.map((r) => ({ name: r.type.split(" / ")[0], value: r._count }));
  const byCountry = byCountryRaw
    .filter((r) => r.country)
    .map((r) => ({ name: r.country as string, value: r._count }));

  // Representative baseline for trend panels (12-month programme view).
  const byMonth = [
    { name: "ກ.ພ", value: 28 }, { name: "ມີ", value: 35 }, { name: "ເມ", value: 31 },
    { name: "ພ", value: 44 }, { name: "ມິ", value: 39 }, { name: "ກ.ລ", value: 41 },
  ];
  const respTrend = [
    { name: "ກ.ພ", value: 6.8 }, { name: "ມີ", value: 6.1 }, { name: "ເມ", value: 5.4 },
    { name: "ພ", value: 4.9 }, { name: "ມິ", value: 4.5 }, { name: "ກ.ລ", value: 4.2 },
  ];

  const rate = total ? Math.round((resolved / total) * 100) : 0;

  return (
    <>
      <PageHeader lo="ລາຍງານ" en="Reports" sub="ສະຖິຕິ ເຫດການ ແລະ ການຕອບໂຕ້" />

      <div className="space-y-8 p-6">
        {/* Resolved-rate is the number a programme is judged on, so it is the
            one that dominates here — the same device as the dashboard, pointed
            at a different question. */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <StatBlock lo="ອັດຕາ ແກ້ໄຂ" en="Resolved rate" value={rate} unit="%" tone="success" dominant className="lg:col-span-2" />
          <StatBlock lo="ເຫດການ ທັງໝົດ" en="Total cases" value={total} />
          <StatBlock lo="ຕອບໂຕ້ ດີສຸດ" en="Best response" value="1.1" unit="min" />
          <StatBlock lo="ພັນທະມິດ" en="Partners" value={3} />
        </section>

        <ReportsCharts byType={byType} byMonth={byMonth} byCountry={byCountry} respTrend={respTrend} />
      </div>
    </>
  );
}
