import Link from "next/link";
import type { Metadata } from "next";
import {
  ShieldAlert, ArrowRight, ArrowDown, TrendingDown, MapPin, Info, ExternalLink,
} from "lucide-react";
import { Reveal } from "@/components/motion";
import { Pictograph } from "@/components/pictograph";
import { BigStatFigure, SourceLine } from "@/components/stat-figure";
import { DistributionBars, type DistBar } from "@/components/distribution-bars";
import {
  GLOBAL_SCALE, WHO_PICTOGRAPHS, FORMS_OF_EXPLOITATION, FORMS_INSIGHT,
  REGION_SCALE, LAOS_TIER, LAOS_FACTS, LAOS_ROUTES, HIDDEN_NOTE, SOURCES,
} from "@/lib/trafficking-stats";
import { THREAT_REFERENCE, latestOf } from "@/lib/threat-reference";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "ຂໍ້ມູນ ການ ຄ້າ ມະນຸດ / The data — SafeZone",
  description:
    "Verified statistics on human trafficking — worldwide, across Southeast Asia, and in Laos. Sourced from UNODC, ILO, Walk Free, UN OHCHR and the US State Department.",
};

const formsBars: DistBar[] = FORMS_OF_EXPLOITATION.map((f) => ({
  lo: f.lo,
  en: f.en,
  value: f.pct,
  valueText: `${f.pct}%`,
  tone: f.tone,
}));

// Reuse the console's UNODC reference data: detected victims by country, latest
// reported year, ranked. This is the same published baseline the staff threat
// map shades countries by — shown here to a public audience.
const countryBars: DistBar[] = THREAT_REFERENCE.map((e) => {
  const { year, value } = latestOf(e);
  return {
    lo: e.countryLo,
    en: `${e.countryEn} · ${year}`,
    value,
    valueText: value.toLocaleString("en-US"),
    tone: "critical" as const,
  };
}).sort((a, b) => b.value - a.value);

const TIER_TONE: Record<string, string> = {
  "Tier 2": "border-high text-high-ink",
  "Tier 2 Watch List": "border-high bg-high/10 text-high-ink",
  "Tier 3": "border-critical bg-critical/10 text-critical-ink",
};

function SectionEyebrow({ en }: { en: string }) {
  return (
    <span lang="en" className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
      {en}
    </span>
  );
}

export default function DataPage() {
  return (
    <>
      {/* ── Hero: aspiration, then the hard number ─────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-primary text-primary-foreground">
        {/* Dignity over shock: a faint isotype field, not a photograph. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1.5px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-critical/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-page px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <Reveal className="max-w-3xl">
            <SectionEyebrow en="SafeZone · The data behind the mission" />
            <h1 lang="lo" className="mt-4 font-lao text-3xl font-bold leading-snug sm:text-4xl lg:text-5xl">
              ພວກ ເຮົາ ຝັນ ຢາກ ເຫັນ ໂລກ ທີ່ ຄົນ ບໍ່ ຖືກ ຊື້ ຂາຍ.
            </h1>
            <p lang="lo" className="mt-5 max-w-2xl font-lao text-lg leading-lao text-primary-foreground/90">
              ແຕ່ ຕອນ ນີ້ —{" "}
              <span className="font-bold text-primary-foreground">
                ປະມານ{" "}
                <span className="numeral text-4xl leading-none tracking-tight sm:text-5xl">50</span>{" "}
                ລ້ານ ຄົນ
              </span>{" "}
              ຍັງ ຕົກ ຢູ່ ໃນ ການ ເປັນ ຂ້າ ທາດ ຍຸກ ໃໝ່. ນີ້ ຄື ຕົວເລກ ທີ່ ຢືນຢັນ ແລ້ວ,
              ແລະ ຄວາມ ຈິງ ຍັງ ໃຫຍ່ ກວ່າ ນີ້.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/report"
                className="inline-flex h-11 items-center gap-2 rounded-sm bg-primary px-6 font-lao text-sm font-semibold leading-lao text-primary-foreground transition-colors duration-fast hover:bg-primary/90"
              >
                <ShieldAlert aria-hidden className="size-4" />
                ລາຍງານ ການ ຄ້າ ມະນຸດ
              </Link>
              <a
                href="#scale"
                className="inline-flex h-11 items-center gap-2 rounded-sm border border-primary-foreground/30 px-6 font-lao text-sm font-semibold leading-lao text-primary-foreground transition-colors duration-fast hover:bg-primary-foreground/10"
              >
                ເບິ່ງ ຂໍ້ມູນ
                <ArrowDown aria-hidden className="size-4" />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── The honesty note ───────────────────────────────────────────────── */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-page items-start gap-3 px-4 py-6 sm:px-6 lg:px-8">
          <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <p className="flex flex-col gap-0.5">
            <span lang="lo" className="font-lao text-sm leading-lao">{HIDDEN_NOTE.lo}</span>
            <span lang="en" className="annotation normal-case tracking-normal">{HIDDEN_NOTE.en}</span>
          </p>
        </div>
      </section>

      {/* ── The scale ──────────────────────────────────────────────────────── */}
      <section id="scale" className="mx-auto max-w-page scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <SectionEyebrow en="The scale" />
          <h2 lang="lo" className="mt-2 font-lao text-2xl font-bold leading-lao sm:text-3xl">
            ຂະໜາດ ຂອງ ບັນຫາ
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {GLOBAL_SCALE.map((stat, i) => (
            <Reveal key={stat.enCaption} delay={i * 80}>
              <BigStatFigure stat={stat} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Who: isotype pictographs ───────────────────────────────────────── */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-page px-4 py-16 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <SectionEyebrow en="Who is exploited" />
            <h2 lang="lo" className="mt-2 font-lao text-2xl font-bold leading-lao sm:text-3xl">
              ໃຜ ຄື ຜູ້ ຖືກ ຂູດຮີດ
            </h2>
            <p lang="lo" className="mt-3 font-lao text-sm leading-lao text-muted-foreground">
              ໃນ ບັນດາ ຜູ້ ເສຍຫາຍ ທີ່ ຖືກ ກວດ ພົບ ທົ່ວ ໂລກ (UNODC, ຂໍ້ມູນ ປີ 2022) —
              ແຕ່ ລະ ຮູບ ຄື ໜຶ່ງ ຄົນ ໃນ ຮ້ອຍ.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            {WHO_PICTOGRAPHS.map((p) => (
              <Reveal key={p.enTitle} className="rounded-sm border border-border bg-background p-6">
                <div className="flex items-baseline gap-3">
                  <span
                    className={cn(
                      "numeral text-[3.25rem] leading-none sm:text-[4rem]",
                      p.tone === "critical" ? "text-critical-ink" : "text-high-ink"
                    )}
                  >
                    {p.filled}%
                  </span>
                  <span className="flex flex-col">
                    <span lang="lo" className="font-lao text-sm font-semibold leading-lao">{p.loBody}</span>
                    <span lang="en" className="annotation normal-case tracking-normal">{p.enBody}</span>
                  </span>
                </div>
                <Pictograph
                  className="mt-5"
                  filled={p.filled}
                  total={100}
                  columns={25}
                  tone={p.tone}
                  label={`${p.filled} ${p.enBody}`}
                />
                <SourceLine id={p.sourceId} className="mt-4" />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Forms of exploitation ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-page px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <Reveal>
            <SectionEyebrow en="Forms of exploitation" />
            <h2 lang="lo" className="mt-2 font-lao text-2xl font-bold leading-lao sm:text-3xl">
              ຮູບ ແບບ ຂອງ ການ ຂູດຮີດ
            </h2>
            <p lang="lo" className="mt-3 max-w-md font-lao text-sm leading-lao text-muted-foreground">
              ສ່ວນ ແບ່ງ ຂອງ ຜູ້ ເສຍຫາຍ ທີ່ ຖືກ ກວດ ພົບ ໃນ ປີ 2022, ຕາມ ຮູບ ແບບ ຂອງ ການ ຂູດຮີດ.
            </p>
            <div className="mt-6 rounded-sm border-l-bar border-l-critical bg-muted/50 p-4">
              <p lang="lo" className="font-lao text-sm leading-lao">{FORMS_INSIGHT.lo}</p>
              <span lang="en" className="annotation mt-1.5 block normal-case tracking-normal">{FORMS_INSIGHT.en}</span>
              <SourceLine id={FORMS_INSIGHT.sourceId} className="mt-2" />
            </div>
          </Reveal>
          <Reveal delay={100} className="lg:pt-8">
            <DistributionBars bars={formsBars} max={100} />
          </Reveal>
        </div>
      </section>

      {/* ── Where: the region closest to home ──────────────────────────────── */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-page px-4 py-16 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <SectionEyebrow en="Where — closest to home" />
            <h2 lang="lo" className="mt-2 font-lao text-2xl font-bold leading-lao sm:text-3xl">
              ບ່ອນ ໃກ້ ບ້ານ ເຮົາ ທີ່ ສຸດ
            </h2>
            <p lang="lo" className="mt-3 font-lao text-sm leading-lao text-muted-foreground">
              ອາຊີ ຕາເວັນ ອອກ ສ່ຽງ ໃຕ້ ເປັນ ໜຶ່ງ ໃນ ເຂດ ທີ່ ໜັກ ໜ່ວງ ທີ່ ສຸດ ໃນ ໂລກ,
              ໂດຍ ສະເພາະ ‘ສູນ ຫຼອກລວງ ອອນລາຍ’ ທີ່ ໃຊ້ ຄົນ ຖືກ ຄ້າ ເປັນ ແຮງງານ.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-3">
            {REGION_SCALE.map((stat, i) => (
              <Reveal key={stat.enCaption} delay={i * 80}>
                <BigStatFigure stat={stat} />
              </Reveal>
            ))}
          </div>

          {/* Detected victims by country — the console's UNODC reference data. */}
          <Reveal className="mt-14 rounded-sm border border-border bg-background p-6">
            <div className="flex items-center gap-2">
              <MapPin aria-hidden className="size-4 text-critical-ink" />
              <h3 lang="lo" className="font-lao text-sm font-semibold leading-lao">
                ຜູ້ ເສຍຫາຍ ທີ່ ກວດ ພົບ ຕໍ່ ປີ — ຕາມ ປະເທດ ເພື່ອນ ບ້ານ
              </h3>
            </div>
            <span lang="en" className="annotation mt-0.5 block normal-case tracking-normal">
              Detected victims per year, neighbouring countries — latest reported
            </span>
            <div className="mt-6">
              <DistributionBars bars={countryBars} />
            </div>
            <p lang="lo" className="mt-4 font-lao text-xs leading-lao text-muted-foreground">
              ໝາຍ ເຫດ: ສປປ ລາວ ບໍ່ ໄດ້ ລາຍງານ ຕົວເລກ ໃຫ້ UNODC — ‘ບໍ່ ມີ ຂໍ້ມູນ’ ບໍ່ ໄດ້ ໝາຍ ຄວາມ ວ່າ ‘ບໍ່ ມີ ການ ຄ້າ ມະນຸດ’.
            </p>
            <SourceLine id="glotip" className="mt-2" />
          </Reveal>
        </div>
      </section>

      {/* ── Laos in focus ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-page px-4 py-16 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <SectionEyebrow en="Laos in focus" />
          <h2 lang="lo" className="mt-2 font-lao text-2xl font-bold leading-lao sm:text-3xl">
            ສະ ເພາະ ສປປ ລາວ
          </h2>
        </Reveal>

        {/* Tier trajectory — a declining ranking, stated plainly. */}
        <Reveal className="mt-10 rounded-sm border border-border bg-card p-6">
          <div className="flex flex-wrap items-center gap-2">
            <TrendingDown aria-hidden className="size-5 text-critical-ink" />
            <span lang="lo" className="font-lao text-sm font-semibold leading-lao">
              ອັນດັບ ຂອງ ສປປ ລາວ ໃນ ລາຍງານ TIP ຂອງ ສະຫະລັດ
            </span>
          </div>
          <ol className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
            {LAOS_TIER.trajectory.map((t, i) => (
              <li key={t.year} className="flex items-center gap-2 sm:gap-0">
                <div className={`flex items-center gap-2 rounded-sm border px-3 py-2 ${TIER_TONE[t.enTier] ?? "border-border"}`}>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{t.year}</span>
                  <span lang="lo" className="font-lao text-sm font-semibold leading-lao">{t.loTier}</span>
                </div>
                {i < LAOS_TIER.trajectory.length - 1 && (
                  <ArrowRight aria-hidden className="mx-2 size-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" />
                )}
              </li>
            ))}
          </ol>
          <p lang="lo" className="mt-4 font-lao text-sm leading-lao text-muted-foreground">
            ຕົກ ລົງ ສາມ ປີ ຕິດ ຕໍ່ ກັນ — ‘ລະດັບ 3’ ຄື ອັນດັບ ຕ່ຳ ສຸດ, ໝາຍ ຄວາມ ວ່າ ການ ຮັບ ມື ຍັງ ບໍ່ ພຽງ ພໍ.
          </p>
          <SourceLine id={LAOS_TIER.sourceId} className="mt-2" />
        </Reveal>

        <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2">
          {LAOS_FACTS.map((stat, i) => (
            <Reveal key={stat.enCaption} delay={i * 80}>
              <BigStatFigure stat={stat} />
            </Reveal>
          ))}
        </div>

        {/* Routes */}
        <Reveal className="mt-12">
          <h3 lang="lo" className="font-lao text-lg font-semibold leading-lao">
            ຄົນ ລາວ ຖືກ ຄ້າ ໄປ ໃສ?
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {LAOS_ROUTES.map((r) => (
              <div key={r.en} className="rounded-sm border border-border bg-card p-5">
                <p lang="lo" className="font-lao text-sm leading-lao">{r.lo}</p>
                <span lang="en" className="annotation mt-2 block normal-case tracking-normal">{r.en}</span>
                <SourceLine id={r.sourceId} className="mt-2" />
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Sources ────────────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-page px-4 py-14 sm:px-6 lg:px-8">
          <SectionEyebrow en="Sources" />
          <h2 lang="lo" className="mt-2 font-lao text-xl font-bold leading-lao">
            ແຫຼ່ງ ຂໍ້ມູນ
          </h2>
          <p lang="lo" className="mt-2 max-w-2xl font-lao text-sm leading-lao text-muted-foreground">
            ທຸກ ຕົວເລກ ໃນ ໜ້າ ນີ້ ມາ ຈາກ ອົງກອນ ສາກົນ ທີ່ ເຊື່ອ ຖື ໄດ້. ກົດ ເພື່ອ ອ່ານ ຕົ້ນ ສະບັບ.
          </p>
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {Object.values(SOURCES).map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center justify-between gap-4 py-3 transition-colors hover:bg-background"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold">{s.publication}</span>
                    <span lang="en" className="annotation normal-case tracking-normal">{s.org} · {s.year}</span>
                  </span>
                  <ExternalLink aria-hidden className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-page px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-6 rounded-sm border border-border bg-primary p-8 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <h2 lang="lo" className="font-lao text-2xl font-bold leading-lao">
              ຂໍ້ມູນ ເລີ່ມ ຈາກ ຄົນ ດຽວ ທີ່ ກ້າ ເວົ້າ.
            </h2>
            <p lang="lo" className="mt-2 max-w-xl font-lao text-sm leading-lao text-primary-foreground/85">
              ຖ້າ ທ່ານ ເຫັນ ຫຼື ສົງໄສ ວ່າ ມີ ການ ຄ້າ ມະນຸດ — ລາຍງານ ໄດ້ ຢ່າງ ເປັນ ຄວາມ ລັບ.
            </p>
          </div>
          <Link
            href="/report"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm bg-primary px-6 font-lao text-sm font-semibold leading-lao text-primary-foreground transition-colors duration-fast hover:bg-primary/90"
          >
            <ShieldAlert aria-hidden className="size-4" />
            ລາຍງານ ດຽວ ນີ້
          </Link>
        </div>
      </section>
    </>
  );
}
