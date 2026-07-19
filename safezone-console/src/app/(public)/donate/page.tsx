import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HandCoins, ExternalLink, Landmark, ScanLine, ShieldCheck, Send, Users, GraduationCap } from "lucide-react";
import {
  getDonationConfig,
  donationReady,
  DONATION_DEFAULTS,
  DONATION_PRESET_QRS,
} from "@/lib/settings";
import { qrPublicUrl } from "@/lib/donation-storage";

export const metadata: Metadata = {
  title: "ບໍລິຈາກ / Donate — SafeZone",
  description: "Support SafeZone — help protect Lao travellers from trafficking.",
};

// Read live settings on every request so an admin toggle takes effect at once.
export const dynamic = "force-dynamic";

/**
 * What donations pay for. Shown so a giver knows exactly where the money goes —
 * trust is the whole point of an anti-trafficking charity.
 */
const USES = [
  {
    icon: ShieldCheck,
    lo: "ດຳເນີນ ສູນ ຮັບ ແຈ້ງເຫດ ສຸກເສີນ ຕະຫຼອດ 24 ຊົ່ວໂມງ",
    en: "Running the 24/7 emergency response console",
  },
  {
    icon: Send,
    lo: "ຄ່າ ສົ່ງ ຂໍ້ຄວາມ ແຈ້ງເຕືອນ SOS ແລະ ລະຫັດ OTP",
    en: "SOS alert and OTP message delivery",
  },
  {
    icon: Users,
    lo: "ຊ່ວຍເຫຼືອ ຜູ້ ຖືກ ຄ້າມະນຸດ ໃຫ້ ກັບ ຄືນ ບ້ານ ຢ່າງ ປອດໄພ",
    en: "Helping trafficking survivors return home safely",
  },
  {
    icon: GraduationCap,
    lo: "ໃຫ້ ຄວາມຮູ້ ແລະ ປ້ອງກັນ ແກ່ ຄົນລາວ ທີ່ ເດີນທາງ ໄປ ຕ່າງປະເທດ",
    en: "Awareness and prevention for Lao travellers",
  },
] as const;

/**
 * Public donate page (item #14b). Fail-open: if staff have switched donations
 * off, the whole page 404s (and the nav/footer links are already hidden). When
 * on, it explains what donations fund and shows the QR codes to give — a custom
 * uploaded one, or the built-in amount-preset QRs as a grid of cards.
 */
export default async function DonatePage() {
  const cfg = await getDonationConfig();
  if (!donationReady(cfg)) notFound();

  const titleLo = cfg.titleLo || DONATION_DEFAULTS.titleLo;
  const titleEn = cfg.titleEn || DONATION_DEFAULTS.titleEn;
  const blurbLo = cfg.blurbLo || DONATION_DEFAULTS.blurbLo;
  const blurbEn = cfg.blurbEn || DONATION_DEFAULTS.blurbEn;
  const customQr = cfg.qrPath ? qrPublicUrl(cfg.qrPath) : "";

  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-page px-4 py-14 sm:px-6 lg:px-8">
          <span lang="en" className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            {titleEn}
          </span>
          <h1 lang="lo" className="mt-2 flex items-center gap-3 font-lao text-3xl font-bold leading-lao sm:text-4xl">
            <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-primary text-primary-foreground">
              <HandCoins aria-hidden className="size-5" />
            </span>
            {titleLo}
          </h1>
          <p lang="lo" className="mt-4 max-w-2xl font-lao text-base leading-lao text-muted-foreground">
            {blurbLo}
          </p>
          <p lang="en" className="mt-1 max-w-2xl text-sm text-muted-foreground/80">
            {blurbEn}
          </p>
        </div>
      </section>

      {/* What your donation is used for */}
      <section className="mx-auto max-w-page px-4 pt-14 sm:px-6 lg:px-8">
        <h2 lang="lo" className="font-lao text-xl font-bold leading-lao">
          ເງິນ ບໍລິຈາກ ຖືກ ໃຊ້ ເຮັດ ຫຍັງ?
        </h2>
        <p lang="en" className="annotation mt-0.5">What your donation is used for</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {USES.map((u) => (
            <div key={u.en} className="flex items-start gap-3 rounded-sm border border-border bg-card p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary">
                <u.icon aria-hidden className="size-4" />
              </span>
              <div className="min-w-0">
                <p lang="lo" className="font-lao text-sm font-semibold leading-lao">{u.lo}</p>
                <p lang="en" className="annotation">{u.en}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Give — QR (custom or built-in preset cards) */}
      <section className="mx-auto max-w-page px-4 py-14 sm:px-6 lg:px-8">
        <h2 lang="lo" className="font-lao text-xl font-bold leading-lao">ບໍລິຈາກ ຜ່ານ QR</h2>
        <p lang="lo" className="mt-1 flex items-center gap-1.5 font-lao text-sm leading-lao text-muted-foreground">
          <ScanLine aria-hidden className="size-4 shrink-0" />
          ສະແກນ QR ດ້ວຍ ແອັບ ທະນາຄານ ຂອງ ທ່ານ (BCEL One) ເພື່ອ ບໍລິຈາກ ຕາມ ຈຳນວນ ທີ່ ເລືອກ.
        </p>

        {customQr ? (
          <div className="mt-6 flex max-w-xs flex-col items-center rounded-sm border border-border bg-card p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={customQr} alt="QR" className="w-full rounded-sm border border-border bg-card object-contain" />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DONATION_PRESET_QRS.map((p) => (
              <div
                key={p.lak}
                className="flex flex-col overflow-hidden rounded-sm border border-border bg-card"
              >
                <div className="flex items-baseline justify-between gap-2 border-b border-border px-4 py-3">
                  <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                    {p.lak.toLocaleString("en-US")}
                  </span>
                  <span lang="lo" className="font-lao text-sm text-muted-foreground">ກີບ</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.img}
                  alt={`QR ${p.lak.toLocaleString("en-US")} ກີບ`}
                  className="w-full bg-white object-contain p-3"
                />
              </div>
            ))}
          </div>
        )}

        {/* Other ways to give — link + bank */}
        {(cfg.url || cfg.bank) && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {cfg.url && (
              <div className="rounded-sm border border-border bg-primary p-6 text-primary-foreground">
                <h3 lang="lo" className="font-lao text-lg font-bold leading-lao">ບໍລິຈາກ ອອນລາຍ</h3>
                <p lang="lo" className="mt-2 font-lao text-sm leading-lao text-primary-foreground/85">
                  ກົດ ປຸ່ມ ດ້ານລຸ່ມ ເພື່ອ ໄປ ໜ້າ ບໍລິຈາກ.
                </p>
                <a
                  href={cfg.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-sm bg-primary-foreground px-5 font-lao text-sm font-semibold leading-lao text-primary transition-colors duration-fast hover:bg-primary-foreground/90"
                >
                  <ExternalLink aria-hidden className="size-4" />
                  ໄປ ໜ້າ ບໍລິຈາກ
                </a>
              </div>
            )}

            {cfg.bank && (
              <div className="rounded-sm border border-border bg-card p-6">
                <div className="flex items-center gap-2.5">
                  <Landmark aria-hidden className="size-4 text-muted-foreground" />
                  <h3 lang="lo" className="font-lao text-sm font-semibold leading-lao">ໂອນ ຜ່ານ ທະນາຄານ</h3>
                </div>
                <p lang="lo" className="mt-3 whitespace-pre-line font-lao text-sm leading-lao text-muted-foreground">
                  {cfg.bank}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
