import { PageHeader } from "@/components/page-header";
import { StatBlock } from "@/components/stat-card";
import { CaseRow } from "@/components/case-row";
import { Bilingual } from "@/components/bilingual";
import { requireStaff, caseScope } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listCases } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const staff = await requireStaff();
  const scope = caseScope(staff);

  const [active, open, resolved, cases] = await Promise.all([
    prisma.case.count({ where: { ...scope, status: "NEW" } }),
    prisma.case.count({ where: { ...scope, status: { in: ["NEW", "IN_PROGRESS"] } } }),
    prisma.case.count({ where: { ...scope, status: "RESOLVED" } }),
    listCases(staff),
  ]);

  // Triage order is the design. Unresolved first, most severe first, then oldest
  // first — a critical case that has been waiting 40 minutes outranks one that
  // arrived 30 seconds ago.
  const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
  const urgent = cases
    .filter((c) => c.status !== "RESOLVED")
    .sort(
      (a, b) =>
        rank[a.severity] - rank[b.severity] ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  return (
    <>
      <PageHeader lo="ພາບລວມ" en="Dashboard" sub="ເຫດການ ແລະ ການຕອບໂຕ້ ແບບ real-time" />

      <div className="space-y-8 p-6">
        {/* Asymmetric by intent. The New-SOS block spans two columns and uses
            the one dominant type size in the system — a dashboard where every
            card is equal is a dashboard with no opinion. */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <StatBlock
            lo="ເຫດການ ໃໝ່"
            en="New SOS"
            value={active}
            tone="critical"
            dominant
            live
            className="lg:col-span-2"
          />
          <StatBlock lo="ກຳລັງ ດຳເນີນ" en="Open" value={open} />
          <StatBlock lo="ຕອບໂຕ້ ສະເລ່ຍ" en="Avg response" value="4.2" unit="min" />
          <StatBlock lo="ແກ້ໄຂ ແລ້ວ" en="Resolved" value={resolved} tone="success" />
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between border-b border-border-strong pb-2">
            <Bilingual
              lo="ຕ້ອງການ ຕອບໂຕ້ ດຽວນີ້"
              en="Needs response now"
              loClassName="text-base font-semibold"
            />
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              {urgent.length}
            </span>
          </div>

          {urgent.length === 0 ? (
            // An empty SOS queue is a good state. State it; do not celebrate it.
            <p lang="lo" className="border border-border bg-card px-4 py-8 text-center font-lao text-sm leading-lao text-muted-foreground">
              ບໍ່ມີ ເຄສ ດ່ວນ ໃນ ຂະນະ ນີ້
            </p>
          ) : (
            <ul className="space-y-px">
              {urgent.map((c) => (
                <li key={c.id}>
                  <CaseRow c={c} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
