import { CircleCheck, CircleDashed, KeyRound, UserRound, LockKeyhole } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, PanelTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireStaff } from "@/lib/auth";
import { getPassportApiConfig, passportApiReady } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { changePassword, savePassportApiSettings, updateAccountName } from "./actions";

export const dynamic = "force-dynamic";

/** Outcome banners for the self-service forms, keyed by query param. */
const ACCOUNT_MSG = {
  saved: { lo: "ບັນທຶກ ຊື່ ແລ້ວ", cls: "border-success text-success-ink" },
  empty: { lo: "ກະລຸນາ ປ້ອນ ຊື່", cls: "border-critical text-critical-ink" },
} as const;

const PW_MSG = {
  saved: { lo: "ປ່ຽນ ລະຫັດຜ່ານ ສຳເລັດ ແລ້ວ", cls: "border-success text-success-ink" },
  short: { lo: "ລະຫັດຜ່ານ ຕ້ອງ ຢ່າງໜ້ອຍ 8 ຕົວອັກສອນ", cls: "border-critical text-critical-ink" },
  mismatch: { lo: "ລະຫັດຜ່ານ ທັງສອງ ບໍ່ ກົງກັນ", cls: "border-critical text-critical-ink" },
  error: { lo: "ປ່ຽນ ລະຫັດຜ່ານ ບໍ່ ສຳເລັດ — ລອງ ໃໝ່ ອີກຄັ້ງ", cls: "border-critical text-critical-ink" },
} as const;

function FormBanner({ msg }: { msg: { lo: string; cls: string } }) {
  return (
    <p lang="lo" className={cn("border bg-muted p-2.5 font-lao text-sm leading-lao", msg.cls)}>
      {msg.lo}
    </p>
  );
}

/**
 * Settings. Two audiences on one page:
 * - "My account" (every role): display name + change password, self-service.
 * - System integrations (embassy only): the ministry passport-API config.
 *   The service does not exist yet — the form is here so the key can be
 *   dropped in the moment it does; until then KYC works manually, unchanged.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { account?: string; pw?: string };
}) {
  const staff = await requireStaff();
  const canConfigureSystem = staff.role !== "PARTNER";

  const cfg = canConfigureSystem ? await getPassportApiConfig() : null;
  const ready = cfg ? passportApiReady(cfg) : false;

  const accountMsg =
    searchParams.account && searchParams.account in ACCOUNT_MSG
      ? ACCOUNT_MSG[searchParams.account as keyof typeof ACCOUNT_MSG]
      : null;
  const pwMsg =
    searchParams.pw && searchParams.pw in PW_MSG
      ? PW_MSG[searchParams.pw as keyof typeof PW_MSG]
      : null;

  return (
    <>
      <PageHeader
        lo="ຕັ້ງຄ່າ"
        en="Settings"
        sub="ບັນຊີ ຂອງ ທ່ານ ແລະ ການເຊື່ອມຕໍ່ ກັບ ລະບົບ ພາຍນອກ"
      />

      <div className="max-w-2xl space-y-5 p-6">
        {/* ── My account — every role ─────────────────────────────────── */}
        <Card>
          <PanelTitle lo="ບັນຊີ ຂອງ ຂ້ອຍ" en="My account" />
          <CardContent className="space-y-5">
            <div className="space-y-px text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-border py-2">
                <span lang="lo" className="font-lao leading-lao text-muted-foreground">
                  ອີເມວ
                </span>
                <span className="font-mono text-xs">{staff.email}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <span lang="lo" className="font-lao leading-lao text-muted-foreground">
                  ສິດ ນຳໃຊ້
                </span>
                <span className="font-mono text-xs uppercase">{staff.role}</span>
              </div>
            </div>

            {accountMsg && <FormBanner msg={accountMsg} />}
            <form action={updateAccountName} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">
                  <span lang="lo" className="font-lao leading-lao">
                    ຊື່ ທີ່ ສະແດງ
                  </span>
                </Label>
                <div className="relative">
                  <UserRound
                    aria-hidden
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="fullName"
                    name="fullName"
                    defaultValue={staff.fullName ?? ""}
                    lang="lo"
                    className="pl-8 font-lao"
                    placeholder="ຊື່ ແລະ ນາມສະກຸນ"
                  />
                </div>
              </div>
              <Button type="submit">
                <span lang="lo" className="font-lao">
                  ບັນທຶກ ຊື່
                </span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Change password — every role ─────────────────────────────── */}
        <Card>
          <PanelTitle lo="ປ່ຽນ ລະຫັດຜ່ານ" en="Change password" />
          <CardContent className="space-y-4">
            {pwMsg && <FormBanner msg={pwMsg} />}
            <form action={changePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">
                  <span lang="lo" className="font-lao leading-lao">
                    ລະຫັດຜ່ານ ໃໝ່ (ຢ່າງໜ້ອຍ 8 ຕົວອັກສອນ)
                  </span>
                </Label>
                <div className="relative">
                  <LockKeyhole
                    aria-hidden
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">
                  <span lang="lo" className="font-lao leading-lao">
                    ຢືນຢັນ ລະຫັດຜ່ານ ໃໝ່
                  </span>
                </Label>
                <div className="relative">
                  <LockKeyhole
                    aria-hidden
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="confirm"
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className="pl-8"
                  />
                </div>
              </div>
              <Button type="submit">
                <span lang="lo" className="font-lao">
                  ປ່ຽນ ລະຫັດຜ່ານ
                </span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── System integrations — embassy staff only ─────────────────── */}
        {canConfigureSystem && cfg && (
        <Card>
          <PanelTitle
            lo="API ກວດສອບ ໜັງສືຜ່ານແດນ — ກະຊວງ ການຕ່າງປະເທດ"
            en="Passport verification API · Ministry of Foreign Affairs"
          />
          <CardContent className="space-y-5">
            {/* Live state, so the officer knows what KYC will actually do. */}
            <div className="flex items-start gap-2.5 border border-border bg-muted p-3">
              {ready ? (
                <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success-ink" />
              ) : (
                <CircleDashed aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p lang="lo" className="font-lao text-sm font-semibold leading-lao">
                  {ready
                    ? "ເປີດໃຊ້ແລ້ວ — ໜ້າ KYC ຈະມີປຸ່ມ ກວດກັບກະຊວງ"
                    : "ຍັງບໍ່ພ້ອມ — KYC ກວດດ້ວຍມື ຕາມຂັ້ນຕອນ ປົກກະຕິ"}
                </p>
                <p lang="en" className="annotation">
                  {ready
                    ? "Enabled — KYC review offers a ministry check"
                    : "Not active — manual KYC review, same steps as today"}
                </p>
              </div>
            </div>

            <form action={savePassportApiSettings} className="space-y-4">
              <div className="flex items-center gap-2.5">
                <input
                  id="enabled"
                  name="enabled"
                  type="checkbox"
                  defaultChecked={cfg.enabled}
                  className="size-4 accent-primary"
                />
                <Label htmlFor="enabled">
                  <span lang="lo" className="font-lao leading-lao">
                    ເປີດໃຊ້ ການກວດ ຜ່ານ API
                  </span>
                </Label>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="url">
                  <span lang="lo" className="font-lao leading-lao">
                    URL ຂອງ API
                  </span>
                </Label>
                <Input
                  id="url"
                  name="url"
                  type="url"
                  defaultValue={cfg.url}
                  placeholder="https://api.mofa.gov.la/passport"
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="key">
                  <span lang="lo" className="font-lao leading-lao">
                    API key
                  </span>
                </Label>
                <div className="relative">
                  <KeyRound
                    aria-hidden
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="key"
                    name="key"
                    type="password"
                    autoComplete="off"
                    placeholder={cfg.key !== "" ? "•••••••• (ບັນທຶກໄວ້ແລ້ວ — ປ່ອຍວ່າງ = ຄືເກົ່າ)" : "ວາງ key ຈາກ ກະຊວງ ທີ່ນີ້"}
                    className="pl-8 font-mono"
                  />
                </div>
                {cfg.key !== "" && (
                  <label className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                    <input name="clearKey" type="checkbox" className="size-3.5 accent-primary" />
                    <span lang="lo" className="font-lao leading-lao">
                      ລຶບ key ທີ່ບັນທຶກໄວ້
                    </span>
                  </label>
                )}
              </div>

              <Button type="submit">
                <span lang="lo" className="font-lao">
                  ບັນທຶກ
                </span>
              </Button>
            </form>

            <p lang="lo" className="border-t border-border pt-3 font-lao text-xs leading-lao text-muted-foreground">
              ກະຊວງ ຍັງ ບໍ່ທັນ ເປີດ ບໍລິການ ນີ້ — ຟອມ ນີ້ ກຽມໄວ້ ລ່ວງໜ້າ. ເມື່ອ ໄດ້ຮັບ key ແລ້ວ
              ວາງ ໃສ່ ບ່ອນນີ້ ແລ້ວ ເປີດໃຊ້ ໄດ້ເລີຍ; ຖ້າ API ໃຊ້ບໍ່ໄດ້ ໜ້າ KYC ຈະ ກັບໄປ ກວດ ດ້ວຍມື ເອງ ອັດຕະໂນມັດ.
            </p>
          </CardContent>
        </Card>
        )}
      </div>
    </>
  );
}
