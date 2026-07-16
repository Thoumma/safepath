import { CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Bilingual } from "@/components/bilingual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KYC, type KycKey } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { reviewCitizen } from "./actions";

export const dynamic = "force-dynamic";

export default async function KycPage() {
  const staff = await requireStaff();
  const canReview = staff.role !== "PARTNER";

  // PENDING sorts first (Postgres enums order by definition), so the queue
  // that needs a decision sits on top of the settled history.
  const citizens = await prisma.citizen.findMany({
    orderBy: [{ kycStatus: "asc" }, { createdAt: "desc" }],
  });

  const pending = citizens.filter((c) => c.kycStatus === "PENDING").length;

  return (
    <>
      <PageHeader
        lo="ຢືນຢັນ ຕົວຕົນ"
        en="KYC"
        sub={`ລໍຖ້າ ກວດສອບ ${pending} ຄົນ — ທຽບ ຂໍ້ມູນ ກັບ ໜັງສືຜ່ານແດນ ຕົວຈິງ`}
      />

      <div className="p-6">
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
                  <Bilingual lo="ວັນເກີດ" en="DOB" />
                </TableHead>
                <TableHead>
                  <Bilingual lo="ໂທລະສັບ" en="Phone" />
                </TableHead>
                <TableHead>
                  <Bilingual lo="ສະຖານະ" en="Status" />
                </TableHead>
                <TableHead>
                  <Bilingual lo="ກວດ ໂດຍ" en="Reviewed by" />
                </TableHead>
                {canReview && (
                  <TableHead>
                    <Bilingual lo="ຕັດສິນ" en="Decision" />
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {citizens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canReview ? 7 : 6} className="py-8 text-center">
                    <span lang="lo" className="font-lao text-sm leading-lao text-muted-foreground">
                      ຍັງ ບໍ່ມີ ພົນລະເມືອງ ລົງທະບຽນ
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                citizens.map((c) => {
                  const s = KYC[c.kycStatus as KycKey];
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <span lang="lo" className="font-lao font-semibold leading-lao">
                          {c.fullName}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">{c.passportNo}</TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {c.dob ? c.dob.toISOString().slice(0, 10) : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">{c.phone ?? "—"}</TableCell>
                      <TableCell>
                        <Badge className={cn(s.badge)}>
                          <span lang="lo" className="font-lao">
                            {s.lo}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.kycReviewedBy ?? "—"}
                      </TableCell>
                      {canReview && (
                        <TableCell>
                          {/* Re-reviewable on purpose: a wrong verdict must be
                              correctable, and every change lands in the log. */}
                          <div className="flex gap-2">
                            <form action={reviewCitizen}>
                              <input type="hidden" name="citizenId" value={c.id} />
                              <input type="hidden" name="decision" value="VERIFIED" />
                              <Button
                                type="submit"
                                variant="success"
                                size="sm"
                                disabled={c.kycStatus === "VERIFIED"}
                              >
                                <CheckCircle2 />
                                <span lang="lo" className="font-lao">
                                  ຢືນຢັນ
                                </span>
                              </Button>
                            </form>
                            <form action={reviewCitizen}>
                              <input type="hidden" name="citizenId" value={c.id} />
                              <input type="hidden" name="decision" value="REJECTED" />
                              <Button
                                type="submit"
                                variant="outline"
                                size="sm"
                                disabled={c.kycStatus === "REJECTED"}
                              >
                                <XCircle />
                                <span lang="lo" className="font-lao">
                                  ປະຕິເສດ
                                </span>
                              </Button>
                            </form>
                          </div>
                        </TableCell>
                      )}
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
