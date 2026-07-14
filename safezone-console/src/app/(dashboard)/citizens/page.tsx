import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Bilingual } from "@/components/bilingual";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STATUS, type StatusKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CitizensPage({ searchParams }: { searchParams: { q?: string } }) {
  await requireStaff();
  const q = searchParams.q?.trim();

  const citizens = await prisma.citizen.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { passportNo: { contains: q, mode: "insensitive" } },
            { homeProvince: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      contacts: { where: { isPrimary: true }, take: 1 },
      cases: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
    },
    orderBy: { fullName: "asc" },
  });

  return (
    <>
      <PageHeader lo="ພົນລະເມືອງ" en="Citizens" sub="ນັກທ່ອງທ່ຽວ ລາວ ທີ່ ລົງທະບຽນ" />

      <div className="space-y-4 p-6">
        <form className="relative max-w-md">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            name="q"
            defaultValue={q}
            aria-label="ຄົ້ນຫາ ພົນລະເມືອງ"
            placeholder="ຄົ້ນຫາ ຊື່ / ໜັງສືຜ່ານແດນ / ແຂວງ..."
            className="h-10 w-full rounded-sm border border-border bg-card pl-9 pr-3 font-lao text-base placeholder:text-muted-foreground focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:text-sm"
          />
        </form>

        <div className="border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Bilingual lo="ຊື່" en="Name" />
                </TableHead>
                <TableHead>
                  <Bilingual lo="ໜັງສືຜ່ານແດນ" en="Passport" />
                </TableHead>
                <TableHead>
                  <Bilingual lo="ແຂວງ" en="Province" />
                </TableHead>
                <TableHead>
                  <Bilingual lo="ສະຖານະ" en="Status" />
                </TableHead>
                <TableHead>
                  <Bilingual lo="ຜູ້ຕິດຕໍ່" en="Trusted contact" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {citizens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    <span lang="lo" className="font-lao text-sm leading-lao text-muted-foreground">
                      ບໍ່ພົບ ພົນລະເມືອງ
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                citizens.map((c) => {
                  const status = c.cases[0]?.status as StatusKey | undefined;
                  // No emoji. A citizen with an open SOS is marked in red because
                  // red means emergency, not because an icon is friendlier.
                  const s = status ? STATUS[status] : null;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <span lang="lo" className="font-lao font-semibold leading-lao">
                          {c.fullName}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">{c.passportNo}</TableCell>
                      <TableCell lang="lo" className="font-lao text-muted-foreground">
                        {c.homeProvince ?? "—"}
                      </TableCell>
                      <TableCell>
                        {s ? (
                          <Badge className={cn(s.badge)}>
                            <span lang="lo" className="font-lao">
                              {s.lo}
                            </span>
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.contacts[0]?.name ?? "—"}</TableCell>
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
