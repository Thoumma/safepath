import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Bilingual } from "@/components/bilingual";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { requireStaff, caseScope } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { agoLao, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** One merged feed: case timeline events + console audit entries (KYC).
 *  Loudness follows the system rule — an incoming SOS is the only loud row. */
const KIND: Record<string, { lo: string; badge: string }> = {
  sos: { lo: "SOS", badge: "bg-critical text-critical-foreground" },
  route: { lo: "ສົ່ງຕໍ່", badge: "bg-muted text-muted-foreground border border-border" },
  assign: { lo: "ມອບໝາຍ", badge: "bg-high text-high-foreground" },
  call: { lo: "ໂທ", badge: "bg-muted text-muted-foreground border border-border" },
  note: { lo: "ບັນທຶກ", badge: "bg-muted text-muted-foreground border border-border" },
  resolve: { lo: "ແກ້ໄຂ ແລ້ວ", badge: "border border-success text-success-ink bg-transparent" },
  kyc_verify: { lo: "KYC ຢືນຢັນ", badge: "border border-success text-success-ink bg-transparent" },
  kyc_reject: { lo: "KYC ປະຕິເສດ", badge: "bg-critical text-critical-foreground" },
};

const FALLBACK_KIND = { lo: "ອື່ນໆ", badge: "bg-muted text-muted-foreground border border-border" };

export default async function LogsPage() {
  const staff = await requireStaff();

  const [caseEvents, audit] = await Promise.all([
    prisma.caseEvent.findMany({
      // Partners only see history of cases routed to them, same scope as the
      // inbox — the log must not leak cases the inbox itself would not show.
      where: { case: caseScope(staff) },
      include: { case: { select: { id: true, refNo: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    // KYC decisions are embassy business; partner accounts don't see them.
    staff.role === "PARTNER"
      ? Promise.resolve([])
      : prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  const rows = [
    ...caseEvents.map((e) => ({
      id: `ce-${e.id}`,
      when: e.createdAt,
      kind: e.kind,
      message: e.message,
      actor: e.actor,
      caseId: e.case.id,
      refNo: e.case.refNo,
    })),
    ...audit.map((a) => ({
      id: `al-${a.id}`,
      when: a.createdAt,
      kind: a.action,
      message: [a.target, a.detail].filter(Boolean).join(" — "),
      actor: a.actor as string | null,
      caseId: null as string | null,
      refNo: null as string | null,
    })),
  ]
    .sort((a, b) => b.when.getTime() - a.when.getTime())
    .slice(0, 100);

  return (
    <>
      <PageHeader
        lo="ບັນທຶກ ລະບົບ"
        en="Activity Log"
        sub="ທຸກ ການເຄື່ອນໄຫວ — ເຄສ ແລະ ການ ຢືນຢັນ ຕົວຕົນ, ໃໝ່ສຸດ ກ່ອນ"
      />

      <div className="p-6">
        <div className="border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Bilingual lo="ເວລາ" en="When" />
                </TableHead>
                <TableHead>
                  <Bilingual lo="ປະເພດ" en="Kind" />
                </TableHead>
                <TableHead>
                  <Bilingual lo="ລາຍລະອຽດ" en="Detail" />
                </TableHead>
                <TableHead>
                  <Bilingual lo="ເຄສ" en="Case" />
                </TableHead>
                <TableHead>
                  <Bilingual lo="ຜູ້ ດຳເນີນ" en="By" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    <span lang="lo" className="font-lao text-sm leading-lao text-muted-foreground">
                      ຍັງ ບໍ່ມີ ການເຄື່ອນໄຫວ
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const k = KIND[r.kind] ?? FALLBACK_KIND;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
                        {agoLao(r.when)}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(k.badge)}>
                          <span lang="lo" className="font-lao">
                            {k.lo}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span lang="lo" className="font-lao text-sm leading-lao">
                          {r.message}
                        </span>
                      </TableCell>
                      <TableCell>
                        {r.caseId ? (
                          <Link
                            href={`/admin/cases/${r.caseId}`}
                            className="font-mono text-xs tabular-nums underline-offset-2 hover:underline"
                          >
                            {r.refNo}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.actor ?? "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
