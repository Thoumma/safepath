import Link from "next/link";
import type { Metadata } from "next";
import { EyeOff, Lock, Database, Share2, ShieldAlert, Smartphone } from "lucide-react";

export const metadata: Metadata = {
  title: "ກ່ຽວກັບ / About — SafeZone",
  description: "How SafeZone protects Lao travellers and handles trafficking reports.",
};

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-page px-4 py-14 sm:px-6">
          <span lang="en" className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            About
          </span>
          <h1 lang="lo" className="mt-2 font-lao text-3xl font-bold leading-lao sm:text-4xl">
            ກ່ຽວກັບ SafeZone
          </h1>
          <p lang="lo" className="mt-4 max-w-2xl font-lao text-base leading-lao text-muted-foreground">
            SafeZone ຊ່ວຍປົກປ້ອງຄົນລາວທີ່ເດີນທາງໄປຕ່າງປະເທດ. ນອກຈາກແອັບສຸກເສີນ (SOS)
            ແລະ ຕູ້ເກັບໜັງສືຜ່ານແດນທີ່ເຂົ້າລະຫັດແລ້ວ, ພວກເຮົາຍັງເປັນຊ່ອງທາງໃຫ້ທຸກຄົນ
            ລາຍງານການຄ້າມະນຸດ ໄດ້ຢ່າງປອດໄພ.
          </p>
        </div>
      </section>

      {/* How a report is handled — the trust story */}
      <section className="mx-auto max-w-page px-4 py-14 sm:px-6">
        <h2 lang="lo" className="font-lao text-2xl font-bold leading-lao">ລາຍງານຂອງທ່ານຖືກຈັດການແນວໃດ</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            { Icon: EyeOff, lo: "ບໍ່ຕ້ອງເປີດເຜີຍຊື່", en: "Anonymous by default", body: "ທ່ານບໍ່ຈຳເປັນຕ້ອງບອກວ່າທ່ານແມ່ນໃຜ. ຈະໃສ່ຊ່ອງທາງຕິດຕໍ່ ຫຼື ບໍ່ ກໍໄດ້." },
            { Icon: Lock, lo: "ເປັນຄວາມລັບ", en: "Kept confidential", body: "ຂໍ້ມູນຖືກເກັບຢ່າງປອດໄພ ແລະ ເຂົ້າເຖິງໄດ້ສະເພາະທີມງານທີ່ໄດ້ຮັບອະນຸຍາດ." },
            { Icon: Database, lo: "ນຳມາວິເຄາະ", en: "Turned into insight", body: "ທີມງານກວດ ແລະ ວິເຄາະ ລາຍງານ ເພື່ອເຂົ້າໃຈຮູບແບບການຄ້າມະນຸດ." },
            { Icon: Share2, lo: "ສົ່ງໃຫ້ຜູ້ທີ່ຮັບຜິດຊອບ", en: "Shared responsibly", body: "ຂໍ້ມູນຈະຖືກແບ່ງປັນໃຫ້ອົງກອນ ຫຼື ເຈົ້າໜ້າທີ່ ທີ່ກ່ຽວຂ້ອງ ເມື່ອປອດໄພ ແລະ ເໝາະສົມເທົ່ານັ້ນ." },
          ].map(({ Icon, lo, en, body }) => (
            <div key={en} className="rounded-sm border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-sm bg-muted text-foreground">
                  <Icon aria-hidden className="size-4" />
                </span>
                <span className="flex flex-col">
                  <span lang="lo" className="font-lao text-sm font-semibold leading-lao">{lo}</span>
                  <span lang="en" className="annotation">{en}</span>
                </span>
              </div>
              <p lang="lo" className="mt-3 font-lao text-sm leading-lao text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The app */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-page px-4 py-14 sm:px-6">
          <div className="flex items-start gap-3">
            <Smartphone aria-hidden className="mt-1 size-5 shrink-0 text-foreground" />
            <div>
              <h2 lang="lo" className="font-lao text-2xl font-bold leading-lao">ແອັບ SafeZone ສຳລັບນັກເດີນທາງ</h2>
              <p lang="lo" className="mt-3 max-w-2xl font-lao text-sm leading-lao text-muted-foreground">
                ຖ້າທ່ານເປັນຄົນລາວທີ່ເດີນທາງໄປຕ່າງປະເທດ, ແອັບ SafeZone ມີປຸ່ມ SOS ທີ່ສົ່ງຕຳແໜ່ງ
                GPS ໃຫ້ຄົນທີ່ໄວ້ໃຈ ແລະ ສະຖານທູດ, ຕູ້ເກັບໜັງສືຜ່ານແດນທີ່ເຂົ້າລະຫັດ, ແລະ
                ຊ່ອງທາງລາຍງານການຄ້າມະນຸດ ຢູ່ໃນມືຂອງທ່ານ.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-page px-4 py-14 sm:px-6">
        <div className="flex flex-col items-start gap-4 rounded-sm border border-border bg-primary p-8 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
          <h2 lang="lo" className="font-lao text-xl font-bold leading-lao">ພ້ອມທີ່ຈະລາຍງານແລ້ວບໍ?</h2>
          <Link
            href="/report"
            className="inline-flex h-11 items-center gap-2 rounded-sm bg-primary px-6 font-lao text-sm font-semibold leading-lao text-primary-foreground transition-colors duration-fast hover:bg-primary/90"
          >
            <ShieldAlert aria-hidden className="size-4" />
            ລາຍງານການຄ້າມະນຸດ
          </Link>
        </div>
      </section>
    </>
  );
}
