import Link from "next/link";
import type { Metadata } from "next";
import { Phone, ShieldAlert, Building2, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "ຕິດຕໍ່ / Contact — SafeZone",
  description: "Emergency and anti-trafficking hotlines, and how to reach us.",
};

const HOTLINES = [
  { lo: "ຕຳຫຼວດ (ສຸກເສີນ)", en: "Police (emergency)", num: "191" },
  { lo: "ລົດໂຮງໝໍ", en: "Ambulance", num: "195" },
  { lo: "ສາຍດ່ວນຕ້ານການຄ້າມະນຸດ", en: "Anti-trafficking hotline", num: "1300" },
];

export default function ContactPage() {
  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-page px-4 py-14 sm:px-6">
          <span lang="en" className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contact
          </span>
          <h1 lang="lo" className="mt-2 font-lao text-3xl font-bold leading-lao sm:text-4xl">
            ຕິດຕໍ່ ແລະ ຂໍຄວາມຊ່ວຍເຫຼືອ
          </h1>
          <p lang="lo" className="mt-4 max-w-2xl font-lao text-base leading-lao text-muted-foreground">
            ຖ້າມີຄົນຕົກຢູ່ໃນອັນຕະລາຍທັນທີ ໃຫ້ໂທຫາເບີສຸກເສີນທັນທີ. ບໍ່ຮີບດ່ວນ? ໃຊ້ແບບຟອມລາຍງານ.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-page gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2">
        {/* Hotlines */}
        <div>
          <h2 lang="lo" className="font-lao text-xl font-bold leading-lao">ເບີໂທສຸກເສີນ</h2>
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-sm border border-border">
            {HOTLINES.map((h) => (
              <li key={h.num}>
                <a
                  href={`tel:${h.num}`}
                  className="flex items-center gap-4 bg-card px-4 py-4 transition-colors duration-fast hover:bg-muted"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-critical/10 text-critical-ink">
                    <Phone aria-hidden className="size-4" />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span lang="lo" className="font-lao text-sm font-semibold leading-lao">{h.lo}</span>
                    <span lang="en" className="annotation">{h.en}</span>
                  </span>
                  <span className="font-mono text-lg font-bold tabular-nums text-foreground">{h.num}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Report + org */}
        <div className="space-y-6">
          <div className="rounded-sm border border-border bg-primary p-6 text-primary-foreground">
            <h2 lang="lo" className="font-lao text-xl font-bold leading-lao">ລາຍງານການຄ້າມະນຸດ</h2>
            <p lang="lo" className="mt-2 font-lao text-sm leading-lao text-primary-foreground/85">
              ບໍ່ຮີບດ່ວນ ແຕ່ຢາກແຈ້ງ? ສົ່ງລາຍງານ ຢ່າງເປັນຄວາມລັບ ແລະ ບໍ່ຕ້ອງໃສ່ຊື່.
            </p>
            <Link
              href="/report"
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-sm bg-primary px-5 font-lao text-sm font-semibold leading-lao text-primary-foreground transition-colors duration-fast hover:bg-primary/90"
            >
              <ShieldAlert aria-hidden className="size-4" />
              ໄປທີ່ແບບຟອມ
            </Link>
          </div>

          <div className="rounded-sm border border-border bg-card p-6">
            <div className="flex items-center gap-2.5">
              <Building2 aria-hidden className="size-4 text-muted-foreground" />
              <h2 lang="lo" className="font-lao text-sm font-semibold leading-lao">ສະຖານທູດ ລາວ</h2>
            </div>
            <p lang="lo" className="mt-2 font-lao text-sm leading-lao text-muted-foreground">
              ຄົນລາວທີ່ຢູ່ຕ່າງປະເທດ ສາມາດຕິດຕໍ່ສະຖານທູດ ຫຼື ກົງສຸນລາວ ທີ່ໃກ້ທີ່ສຸດ ເພື່ອຂໍຄວາມຊ່ວຍເຫຼືອ.
            </p>
            <a
              href="mailto:info@cits.la"
              className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-fast hover:text-foreground"
            >
              <Mail aria-hidden className="size-4" />
              <span className="font-mono">info@cits.la</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
