import { redirect } from "next/navigation";
import { CircleCheck, CircleDashed, TriangleAlert, Users, Radio } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, PanelTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { smsMode } from "@/lib/sms";
import { cn } from "@/lib/utils";
import { sendBroadcast } from "./actions";

export const dynamic = "force-dynamic";

/** Outcome banners, keyed by the ?b= query the action redirects with. */
const MSG = {
  empty: { lo: "ກະລຸນາ ພິມ ຂໍ້ຄວາມ ກ່ອນ ສົ່ງ", ok: false },
  toolong: { lo: "ຂໍ້ຄວາມ ຍາວ ເກີນ 480 ຕົວອັກສອນ", ok: false },
  unconfirmed: { lo: "ກະລຸນາ ໝາຍ ຢືນຢັນ ກ່ອນ ສົ່ງ", ok: false },
  noprovider: { lo: "ຍັງ ບໍ່ ໄດ້ ຕັ້ງຄ່າ ຜູ້ໃຫ້ບໍລິການ SMS — ຕັ້ງ TWILIO_* ຫຼື SMS_TEST_MODE ກ່ອນ", ok: false },
  norecipients: { lo: "ບໍ່ ມີ ພົນລະເມືອງ ທີ່ ມີ ເບີໂທ ໃນ ລະບົບ", ok: false },
} as const;

function fmt(dt: Date) {
  // Stable, locale-free stamp so server and client render identically.
  return dt.toISOString().slice(0, 16).replace("T", " ");
}

export default async function BroadcastPage({
  searchParams,
}: {
  searchParams: { b?: string; mode?: string; n?: string; fail?: string };
}) {
  const staff = await requireStaff();
  // Blasting every user is an embassy decision, not a partner's.
  if (staff.role === "PARTNER") redirect("/admin");

  const mode = smsMode();
  const [reachable, recent] = await Promise.all([
    prisma.citizen.count({ where: { phone: { not: null } } }),
    prisma.auditLog.findMany({
      where: { action: "broadcast" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  // Success banner is built from the redirect's counts; failures come from MSG.
  const sentBanner =
    searchParams.b === "sent"
      ? {
          lo:
            searchParams.mode === "test"
              ? `ໂໝດ ທົດສອບ — ຈຳລອງ ສົ່ງ ຫາ ${searchParams.n ?? "0"} ຄົນ (ບໍ່ ໄດ້ ສົ່ງ ຈິງ)`
              : `ສົ່ງ ແລ້ວ ຫາ ${searchParams.n ?? "0"} ຄົນ${
                  Number(searchParams.fail ?? 0) > 0 ? ` · ລົ້ມເຫລວ ${searchParams.fail}` : ""
                }`,
          ok: true,
        }
      : null;
  const errBanner =
    searchParams.b && searchParams.b in MSG
      ? MSG[searchParams.b as keyof typeof MSG]
      : null;
  const banner = sentBanner ?? errBanner;

  const providerLine =
    mode === "live"
      ? { lo: "ເປີດໃຊ້ແລ້ວ — ຂໍ້ຄວາມ ຈະ ຖືກ ສົ່ງ ຜ່ານ Twilio ຈິງ", en: "Live — messages send via Twilio", ok: true }
      : mode === "test"
      ? { lo: "ໂໝດ ທົດສອບ — ຈຳລອງ ການສົ່ງ, ບໍ່ ມີ SMS ອອກ ຈິງ", en: "Test mode — sends are simulated, no real SMS", ok: true }
      : { lo: "ຍັງ ບໍ່ ພ້ອມ — ຕັ້ງ TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM (ຫຼື SMS_TEST_MODE=1)", en: "Not configured — set the Twilio env vars, or SMS_TEST_MODE=1", ok: false };

  return (
    <>
      <PageHeader
        lo="ແຈ້ງເຕືອນ ທົ່ວ ລະບົບ"
        en="Broadcast alert"
        sub="ສົ່ງ SMS ຫາ ພົນລະເມືອງ ທຸກ ຄົນ ທີ່ ລົງທະບຽນ ໄວ້"
      />
      <div className="max-w-3xl space-y-5 p-8">
        {/* Provider state — what a send will actually do right now. */}
        <Card>
          <PanelTitle lo="ສະຖານະ ຜູ້ໃຫ້ບໍລິການ SMS" en="SMS provider status" />
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2.5 border border-border bg-muted p-3">
              {providerLine.ok ? (
                <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success-ink" />
              ) : (
                <CircleDashed aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p lang="lo" className="font-lao text-sm font-semibold leading-lao">
                  {providerLine.lo}
                </p>
                <p lang="en" className="annotation">
                  {providerLine.en}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-sm">
              <Users aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span lang="lo" className="font-lao leading-lao text-muted-foreground">
                ຜູ້ຮັບ ທັງໝົດ:
              </span>
              <span className="font-mono font-semibold tabular-nums">{reachable}</span>
              <span lang="lo" className="font-lao leading-lao text-muted-foreground">ຄົນ</span>
            </div>

            {/* The hard limit, stated up front. */}
            <p lang="lo" className="flex items-start gap-2 border-t border-border pt-3 font-lao text-xs leading-lao text-muted-foreground">
              <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              <span>
                ສົ່ງ ໄດ້ ສະເພາະ ຄົນ ທີ່ ລົງທະບຽນ ໃນ SafeZone ເທົ່ານັ້ນ. ບໍ່ ສາມາດ ສົ່ງ ຫາ ເບີ ທຸກ ເບີ ໃນ ລາວ
                ໄດ້ — ນັ້ນ ຕ້ອງ ຜ່ານ ຜູ້ໃຫ້ບໍລິການ ເຄືອຂ່າຍ ແລະ ລັດຖະບານ.
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Compose + send. */}
        <Card>
          <PanelTitle lo="ຂຽນ ຂໍ້ຄວາມ" en="Compose message" />
          <CardContent className="space-y-4">
            {banner && (
              <p
                lang="lo"
                className={cn(
                  "border bg-muted p-2.5 font-lao text-sm leading-lao",
                  banner.ok ? "border-success text-success-ink" : "border-critical text-critical-ink"
                )}
              >
                {banner.lo}
              </p>
            )}

            <form action={sendBroadcast} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="message">
                  <span lang="lo" className="font-lao leading-lao">ຂໍ້ຄວາມ (ສູງສຸດ 480 ຕົວອັກສອນ)</span>
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  lang="lo"
                  rows={4}
                  maxLength={480}
                  required
                  className="font-lao"
                  placeholder="ຕົວຢ່າງ: ມີ ພະຍຸ ແຮງ ໃນ ເຂດ ບາງກອກ ມື້ນີ້ — ຫຼີກເວັ້ນ ການ ເດີນທາງ ຖ້າ ບໍ່ ຈຳເປັນ."
                />
              </div>

              <label className="flex items-start gap-2 text-sm">
                <input name="confirm" type="checkbox" className="mt-0.5 size-4 accent-primary" />
                <span lang="lo" className="font-lao leading-lao text-muted-foreground">
                  ຂ້ອຍ ເຂົ້າໃຈ ວ່າ ຂໍ້ຄວາມ ນີ້ ຈະ ຖືກ ສົ່ງ ຫາ ພົນລະເມືອງ {reachable} ຄົນ ແລະ ຍົກເລີກ ບໍ່ ໄດ້.
                </span>
              </label>

              <Button type="submit" disabled={mode === "off"}>
                <Radio aria-hidden className="size-4" />
                <span lang="lo" className="font-lao">ສົ່ງ ແຈ້ງເຕືອນ</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History, straight from the audit trail. */}
        <Card>
          <PanelTitle lo="ປະຫວັດ ການ ສົ່ງ" en="Recent broadcasts" />
          <CardContent>
            {recent.length === 0 ? (
              <p lang="lo" className="font-lao text-sm leading-lao text-muted-foreground">
                ຍັງ ບໍ່ ເຄີຍ ສົ່ງ ແຈ້ງເຕືອນ.
              </p>
            ) : (
              <ul className="space-y-px text-sm">
                {recent.map((r) => (
                  <li key={r.id} className="border-b border-border py-2 last:border-b-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">{fmt(r.createdAt)}</span>
                      <span className="font-mono text-2xs text-muted-foreground">{r.target}</span>
                    </div>
                    <p lang="lo" className="mt-0.5 font-lao leading-lao">
                      {/* Strip the machine prefix, show the message staff sent. */}
                      {r.detail?.includes(" · ") ? r.detail.split(" · ").slice(1).join(" · ") : r.detail}
                    </p>
                    <span className="font-mono text-2xs text-muted-foreground">by {r.actor}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
