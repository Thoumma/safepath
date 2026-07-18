import type { Metadata } from "next";
import { Phone } from "lucide-react";
import { photosEnabled } from "@/lib/report-storage";
import { ReportForm } from "./report-form";

export const metadata: Metadata = {
  title: "ລາຍງານ / Report — SafeZone",
  description: "Report suspected human trafficking — anonymous, confidential, secure.",
};

export default function ReportPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <span lang="en" className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        Report
      </span>
      <h1 lang="lo" className="mt-2 font-lao text-3xl font-bold leading-lao">ລາຍງານການຄ້າມະນຸດ</h1>
      <p lang="lo" className="mt-3 font-lao text-sm leading-lao text-muted-foreground">
        ຖ້າທ່ານເຫັນ ຫຼື ສົງໄສ ບາງຢ່າງ — ບອກພວກເຮົາ. ໃຊ້ເວລາພຽງສອງສາມນາທີ ແລະ ບໍ່ຕ້ອງໃສ່ຊື່.
      </p>

      {/* Emergency escape hatch — this form is NOT for an immediate danger. */}
      <div className="mt-5 flex items-start gap-3 rounded-sm border border-critical/40 bg-critical/5 p-4">
        <Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-critical-ink" />
        <p lang="lo" className="font-lao text-sm leading-lao">
          ມີຄົນຕົກຢູ່ໃນອັນຕະລາຍທັນທີບໍ? ຢ່າໃຊ້ແບບຟອມນີ້ — ໂທ{" "}
          <a href="tel:191" className="font-semibold underline">191</a> ຫຼື{" "}
          <a href="tel:1300" className="font-semibold underline">1300</a> ທັນທີ.
        </p>
      </div>

      <div className="mt-8">
        <ReportForm photosEnabled={photosEnabled()} />
      </div>
    </section>
  );
}
