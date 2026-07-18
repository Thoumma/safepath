import Link from "next/link";
import {
  ShieldAlert, ArrowRight, EyeOff, Lock, Database, Phone,
  HardHat, UserX, Home as HomeIcon, Baby, HeartCrack, HelpCircle, Check,
} from "lucide-react";
import { REPORT_CATEGORIES, SPOT_THE_SIGNS } from "@/lib/trafficking-signs";

// Resolve the category icon names (strings in the shared data) to components.
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  HardHat, UserX, Home: HomeIcon, Baby, HeartCrack, HelpCircle,
};

export default function PublicHome() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-page gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:py-24">
          <div>
            <span lang="en" className="text-2xs font-semibold uppercase tracking-wider text-primary-foreground/70">
              SafeZone · Anti-trafficking
            </span>
            <h1 lang="lo" className="mt-4 font-lao text-3xl font-bold leading-snug sm:text-4xl lg:text-5xl">
              ຄົນເຮົາ ບໍ່ແມ່ນ ສິນຄ້າ ທີ່ຊື້ຂາຍໄດ້
            </h1>
            <p lang="lo" className="mt-5 max-w-xl font-lao text-base leading-lao text-primary-foreground/85">
              ຖ້າທ່ານເຫັນ, ໄດ້ຍິນ ຫຼື ສົງໄສວ່າ ມີການຄ້າມະນຸດ — ລາຍງານໃຫ້ພວກເຮົາໄດ້
              ຢ່າງເປັນຄວາມລັບ ແລະ ບໍ່ຕ້ອງເປີດເຜີຍຊື່. ທຸກຂໍ້ມູນຊ່ວຍປົກປ້ອງຄົນອື່ນໄດ້.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/report"
                className="inline-flex h-11 items-center gap-2 rounded-sm bg-critical px-6 font-lao text-sm font-semibold leading-lao text-critical-foreground transition-colors duration-fast hover:bg-critical/90"
              >
                <ShieldAlert aria-hidden className="size-4" />
                ລາຍງານການຄ້າມະນຸດ
              </Link>
              <Link
                href="/about"
                className="inline-flex h-11 items-center gap-2 rounded-sm border border-primary-foreground/30 px-6 font-lao text-sm font-semibold leading-lao text-primary-foreground transition-colors duration-fast hover:bg-primary-foreground/10"
              >
                ຮຽນຮູ້ເພີ່ມເຕີມ
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </div>

          {/* Anonymity promise, stated up front. */}
          <div className="flex flex-col justify-center gap-4 border-t border-primary-foreground/20 pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            {[
              { Icon: EyeOff, lo: "ບໍ່ຕ້ອງເປີດເຜີຍຊື່", en: "Anonymous" },
              { Icon: Lock, lo: "ເປັນຄວາມລັບ ແລະ ປອດໄພ", en: "Confidential & secure" },
              { Icon: Database, lo: "ຂໍ້ມູນຊ່ວຍໃຫ້ຕອບໂຕ້ໄດ້ໄວ", en: "Feeds a faster response" },
            ].map(({ Icon, lo, en }) => (
              <div key={en} className="flex items-start gap-3">
                <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary-foreground/80" />
                <span className="flex flex-col">
                  <span lang="lo" className="font-lao text-sm leading-lao">{lo}</span>
                  <span lang="en" className="text-2xs uppercase tracking-wider text-primary-foreground/60">{en}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Spot the signs ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-page px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <span lang="en" className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            Spot the signs
          </span>
          <h2 lang="lo" className="mt-2 font-lao text-2xl font-bold leading-lao sm:text-3xl">
            ສັງເກດສັນຍານເຕືອນ
          </h2>
          <p lang="lo" className="mt-3 font-lao text-sm leading-lao text-muted-foreground">
            ບໍ່ຈຳເປັນຕ້ອງເຫັນທຸກຢ່າງ ຫຼື ແນ່ໃຈ 100%. ຖ້າມີສິ່ງໜຶ່ງເຮັດໃຫ້ທ່ານສົງໄສ ກໍລາຍງານໄດ້.
          </p>
        </div>

        <ul className="mt-8 grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-2">
          {SPOT_THE_SIGNS.map((s) => (
            <li key={s.en} className="flex items-start gap-3 bg-card p-4">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success-ink" />
              <span className="flex flex-col">
                <span lang="lo" className="font-lao text-sm leading-lao">{s.lo}</span>
                <span lang="en" className="annotation">{s.en}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Types of exploitation ────────────────────────────────────────── */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <span lang="en" className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              What to report
            </span>
            <h2 lang="lo" className="mt-2 font-lao text-2xl font-bold leading-lao sm:text-3xl">
              ປະເພດຂອງການຄ້າມະນຸດ
            </h2>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REPORT_CATEGORIES.map((c) => {
              const Icon = ICONS[c.icon] ?? HelpCircle;
              return (
                <div key={c.key} className="flex gap-3 rounded-sm border border-border bg-background p-5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-muted text-foreground">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <span className="flex flex-col">
                    <span lang="lo" className="font-lao text-sm font-semibold leading-lao">{c.lo}</span>
                    <span lang="en" className="annotation">{c.en}</span>
                    <span lang="lo" className="mt-1.5 font-lao text-xs leading-lao text-muted-foreground">{c.hintLo}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Report CTA ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-page px-4 py-16 sm:px-6">
        <div className="flex flex-col items-start gap-6 rounded-sm border border-border bg-primary p-8 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <h2 lang="lo" className="font-lao text-2xl font-bold leading-lao">ເຫັນບາງຢ່າງບໍ? ບອກພວກເຮົາ.</h2>
            <p lang="lo" className="mt-2 max-w-xl font-lao text-sm leading-lao text-primary-foreground/85">
              ໃຊ້ເວລາພຽງ 2 ນາທີ. ບໍ່ຕ້ອງໃສ່ຊື່. ທຸກລາຍງານຖືກກວດໂດຍທີມງານ.
            </p>
          </div>
          <Link
            href="/report"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm bg-critical px-6 font-lao text-sm font-semibold leading-lao text-critical-foreground transition-colors duration-fast hover:bg-critical/90"
          >
            <ShieldAlert aria-hidden className="size-4" />
            ລາຍງານດຽວນີ້
          </Link>
        </div>

        {/* Emergency now */}
        <div className="mt-6 flex items-center gap-3 rounded-sm border border-border bg-card p-5">
          <Phone aria-hidden className="size-5 shrink-0 text-critical-ink" />
          <p lang="lo" className="font-lao text-sm leading-lao">
            ຖ້າມີຄົນຕົກຢູ່ໃນອັນຕະລາຍທັນທີ ໃຫ້ໂທ{" "}
            <a href="tel:191" className="font-semibold text-foreground underline">ຕຳຫຼວດ 191</a>{" "}
            ຫຼື ສາຍດ່ວນ{" "}
            <a href="tel:1300" className="font-semibold text-foreground underline">1300</a>.
          </p>
        </div>
      </section>
    </>
  );
}
