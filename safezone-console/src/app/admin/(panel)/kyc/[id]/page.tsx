import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ImageOff, Landmark, XCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, PanelTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPassportApiConfig, passportApiReady } from "@/lib/settings";
import { KYC, type KycKey } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { checkWithMinistry, reviewCitizen } from "../actions";

export const dynamic = "force-dynamic";

/** Outcome banner for the ministry check, keyed by ?api= after the action. */
const API_RESULT = {
  match: {
    lo: "ກະຊວງ ຢືນຢັນ: ຂໍ້ມູນ ກົງກັບ ໜັງສືຜ່ານແດນ ຈິງ — ຢືນຢັນ ໃຫ້ ອັດຕະໂນມັດ ແລ້ວ",
    cls: "border-success text-success-ink",
  },
  no_match: {
    lo: "ກະຊວງ ບໍ່ພົບ ຂໍ້ມູນ ທີ່ກົງກັນ — ກະລຸນາ ກວດ ດ້ວຍມື ກ່ອນ ຕັດສິນ",
    cls: "border-critical text-critical-ink",
  },
  unavailable: {
    lo: "API ຂອງ ກະຊວງ ຍັງ ໃຊ້ບໍ່ໄດ້ — ກວດ ດ້ວຍມື ຕາມ ຂັ້ນຕອນ ປົກກະຕິ",
    cls: "border-border text-muted-foreground",
  },
} as const;

export default async function KycReviewPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { api?: string };
}) {
  const staff = await requireStaff();
  const canReview = staff.role !== "PARTNER";

  const c = await prisma.citizen.findUnique({ where: { id: params.id } });
  if (!c) notFound();

  const s = KYC[c.kycStatus as KycKey];
  const apiReady = passportApiReady(await getPassportApiConfig());
  const apiResult =
    searchParams.api && searchParams.api in API_RESULT
      ? API_RESULT[searchParams.api as keyof typeof API_RESULT]
      : null;

  return (
    <>
      <PageHeader
        lo="ກວດສອບ ຕົວຕົນ"
        en="KYC review"
        sub="ທຽບ ຮູບ ໜັງສືຜ່ານແດນ ກັບ ຂໍ້ມູນ ທີ່ ລົງທະບຽນ ກ່ອນ ຕັດສິນ"
      />

      <div className="space-y-5 p-6">
        <Link
          href="/admin/kyc"
          className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors duration-fast hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="size-4" />
          <span lang="lo" className="font-lao">
            ກັບໄປ KYC
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-2 border-b border-border-strong pb-5">
          <h2 lang="lo" className="font-lao text-xl font-bold leading-lao">
            {c.fullName}
          </h2>
          <Badge className={cn(s.badge)}>
            <span lang="lo" className="font-lao">
              {s.lo}
            </span>
          </Badge>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{c.passportNo}</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* LEFT: the document itself. This panel is the reason the page
              exists — the officer verifies against the image, not the row. */}
          <Card>
            <PanelTitle lo="ຮູບ ໜັງສືຜ່ານແດນ" en="Passport image" />
            <CardContent>
              {c.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.photoUrl}
                  alt={`ໜັງສືຜ່ານແດນ ຂອງ ${c.fullName}`}
                  className="max-h-[28rem] w-full border border-border bg-muted object-contain"
                />
              ) : (
                <div className="grid h-64 place-items-center border border-border bg-muted">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <ImageOff aria-hidden className="size-6 text-muted-foreground" />
                    <span lang="lo" className="font-lao text-sm leading-lao text-muted-foreground">
                      ຍັງ ບໍ່ມີ ຮູບ ໜັງສືຜ່ານແດນ — ແອັບ ຍັງ ບໍ່ທັນ ສົ່ງ ຮູບ ມາ
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RIGHT: what the citizen claimed at registration + the verdict. */}
          <div className="space-y-4">
            <Card>
              <PanelTitle lo="ຂໍ້ມູນ ທີ່ ລົງທະບຽນ" en="Registered details" />
              <CardContent>
                <Row k="ຊື່" v={c.fullName} />
                <Row k="ໜັງສືຜ່ານແດນ" v={c.passportNo} mono />
                <Row k="ວັນເກີດ" v={c.dob ? c.dob.toISOString().slice(0, 10) : "—"} mono />
                <Row k="ໂທລະສັບ" v={c.phone ?? "—"} mono />
                <Row k="ສັນຊາດ" v={c.nationality} mono />
                <Row k="ແຂວງ" v={c.homeProvince ?? "—"} />
                <Row k="ລົງທະບຽນ ເມື່ອ" v={c.createdAt.toISOString().slice(0, 10)} mono />
                <Row k="ກວດ ໂດຍ" v={c.kycReviewedBy ?? "—"} />
                <Row
                  k="ກວດ ເມື່ອ"
                  v={c.kycReviewedAt ? c.kycReviewedAt.toISOString().slice(0, 10) : "—"}
                  mono
                />
              </CardContent>
            </Card>

            {canReview && (
              <Card>
                <PanelTitle lo="ກວດ ກັບ ກະຊວງ" en="Ministry check" />
                <CardContent className="space-y-3">
                  {apiResult && (
                    <p
                      lang="lo"
                      className={cn(
                        "border px-3 py-2 font-lao text-sm leading-lao",
                        apiResult.cls
                      )}
                    >
                      {apiResult.lo}
                    </p>
                  )}
                  {apiReady ? (
                    <form action={checkWithMinistry}>
                      <input type="hidden" name="citizenId" value={c.id} />
                      <Button type="submit" variant="outline">
                        <Landmark />
                        <span lang="lo" className="font-lao">
                          ກວດ ກັບ ກະຊວງ ການຕ່າງປະເທດ
                        </span>
                      </Button>
                    </form>
                  ) : (
                    <p lang="lo" className="font-lao text-sm leading-lao text-muted-foreground">
                      API ຂອງ ກະຊວງ ຍັງ ບໍ່ໄດ້ ຕັ້ງຄ່າ — ກວດ ດ້ວຍມື ຕາມ ຂັ້ນຕອນ ຂ້າງລຸ່ມ.{" "}
                      <Link href="/admin/settings" className="underline hover:text-foreground">
                        ຕັ້ງຄ່າ
                      </Link>
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {canReview && (
              <Card>
                <PanelTitle lo="ຕັດສິນ" en="Decision" />
                <CardContent>
                  {/* Re-reviewable on purpose: a wrong verdict must be
                      correctable, and every change lands in the log. */}
                  <div className="flex gap-2">
                    <form action={reviewCitizen}>
                      <input type="hidden" name="citizenId" value={c.id} />
                      <input type="hidden" name="decision" value="VERIFIED" />
                      <Button type="submit" variant="success" disabled={c.kycStatus === "VERIFIED"}>
                        <CheckCircle2 />
                        <span lang="lo" className="font-lao">
                          ຢືນຢັນ
                        </span>
                      </Button>
                    </form>
                    <form action={reviewCitizen}>
                      <input type="hidden" name="citizenId" value={c.id} />
                      <input type="hidden" name="decision" value="REJECTED" />
                      <Button type="submit" variant="outline" disabled={c.kycStatus === "REJECTED"}>
                        <XCircle />
                        <span lang="lo" className="font-lao">
                          ປະຕິເສດ
                        </span>
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/** Key/value line. Divided by a hairline, label muted, value in the ink. */
function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span lang="lo" className="shrink-0 font-lao leading-lao text-muted-foreground">
        {k}
      </span>
      <span className={cn("min-w-0 truncate text-right font-medium", mono && "font-mono tabular-nums")}>{v}</span>
    </div>
  );
}
