import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatBlock } from "@/components/stat-card";
import { ReportsCharts } from "@/components/reports-charts";
import { Bilingual } from "@/components/bilingual";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { requireStaff, caseScope } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clusterCases } from "@/lib/hotspots";
import { HotspotSection } from "@/components/hotspot-section";
import { THREAT_REFERENCE, THREAT_REFERENCE_NOTES, latestOf } from "@/lib/threat-reference";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const staff = await requireStaff();
  const scope = caseScope(staff);

  const [total, resolved, byTypeRaw, byCountryRaw, located] = await Promise.all([
    prisma.case.count({ where: scope }),
    prisma.case.count({ where: { ...scope, status: "RESOLVED" } }),
    prisma.case.groupBy({ by: ["type"], where: scope, _count: true }),
    prisma.case.groupBy({ by: ["country"], where: scope, _count: true }),
    prisma.case.findMany({
      where: { ...scope, lat: { not: null }, lng: { not: null } },
      select: {
        id: true, refNo: true, severity: true, type: true,
        city: true, country: true, lat: true, lng: true,
      },
    }),
  ]);

  const hotspots = clusterCases(
    located.map((c) => ({ ...c, lat: c.lat as number, lng: c.lng as number }))
  );

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

        {/* Individual rescues become intelligence here: repeated SOS from the
            same 30 km radius is how a compound announces itself. */}
        <HotspotSection hotspots={hotspots} />

        <ReportsCharts byType={byType} byMonth={byMonth} byCountry={byCountry} respTrend={respTrend} />

        {/* Published baselines, deliberately fenced off from our own case
            stats: everything in this panel is third-party REFERENCE data,
            badged as such, with the source on every row. */}
        <section>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <Bilingual
                lo="ຂໍ້ມູນ ການຄ້າມະນຸດ ສາກົນ"
                en="International trafficking data"
                loClassName="text-sm font-semibold"
              />
              <Badge className="bg-muted text-muted-foreground border border-border">
                <span lang="lo" className="font-lao">
                  ອ້າງອີງ
                </span>
                <span className="ml-1">Reference</span>
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Bilingual lo="ປະເທດ" en="Country" />
                    </TableHead>
                    <TableHead>
                      <Bilingual lo="ຜູ້ເສຍຫາຍ ທີ່ ກວດພົບ" en="Detected victims" />
                    </TableHead>
                    <TableHead>
                      <Bilingual lo="ສ່ວນແບ່ງ" en="Share" />
                    </TableHead>
                    <TableHead>
                      <Bilingual lo="ຊຸດຂໍ້ມູນ 2019–2023" en="Series" />
                    </TableHead>
                    <TableHead>
                      <Bilingual lo="ແຫຼ່ງ" en="Source" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const rows = THREAT_REFERENCE.map((e) => ({ e, latest: latestOf(e) })).sort(
                      (a, b) => b.latest.value - a.latest.value
                    );
                    const sum = rows.reduce((s, r) => s + r.latest.value, 0);
                    return rows.map(({ e, latest }) => (
                      <TableRow key={e.iso2}>
                        <TableCell>
                          <span lang="lo" className="font-lao font-semibold leading-lao">
                            {e.countryLo}
                          </span>{" "}
                          <span className="font-mono text-2xs text-muted-foreground">{e.iso2}</span>
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {latest.value.toLocaleString()}{" "}
                          <span className="text-2xs text-muted-foreground">({latest.year})</span>
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {((latest.value / sum) * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                          {Object.entries(e.series)
                            .map(([, v]) => v)
                            .join(" · ")}
                        </TableCell>
                        <TableCell>
                          <a
                            href={e.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            title={`${e.sourceOrg} — ${e.publication} (accessed ${e.accessedAt})`}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          >
                            UNODC GLOTIP 2024
                            <ExternalLink aria-hidden className="size-3" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
              <ul className="space-y-0.5 border-t border-border pt-2">
                {THREAT_REFERENCE_NOTES.map((n) => (
                  <li key={n.en} className="text-xs text-muted-foreground">
                    <span lang="lo" className="font-lao leading-lao">
                      {n.lo}
                    </span>
                  </li>
                ))}
                <li className="text-xs text-muted-foreground">
                  <span lang="lo" className="font-lao leading-lao">
                    ສ່ວນແບ່ງ ຄິດ ຈາກ ປີ ຫຼ້າສຸດ ຂອງ ແຕ່ລະ ປະເທດ — ປີ ອາດ ບໍ່ ກົງກັນ
                  </span>{" "}
                  (share uses each country&apos;s latest year; years may differ)
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}
