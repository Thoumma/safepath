import Link from "next/link";
import { Shield, Phone } from "lucide-react";

/**
 * Public footer. Repeats the one thing that matters — how to get help now — and
 * the emergency numbers, which must be reachable from every page with no
 * account and no scrolling hunt.
 */
export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto max-w-page px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-sm bg-primary text-primary-foreground">
                <Shield aria-hidden className="size-4" />
              </span>
              <span className="text-base font-bold tracking-tightest">SafeZone</span>
            </div>
            <p lang="lo" className="mt-3 max-w-sm font-lao text-sm leading-lao text-muted-foreground">
              ຊ່ວຍປົກປ້ອງຄົນລາວຈາກການຄ້າມະນຸດ — ລາຍງານສິ່ງທີ່ທ່ານເຫັນ ຢ່າງເປັນຄວາມລັບ ແລະ ບໍ່ເປີດເຜີຍຊື່.
            </p>
          </div>

          <div>
            <h3 lang="lo" className="font-lao text-sm font-semibold leading-lao">ລິ້ງ</h3>
            <ul className="mt-3 space-y-2 font-lao text-sm leading-lao text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground">ໜ້າຫຼັກ</Link></li>
              <li><Link href="/data" className="hover:text-foreground">ຂໍ້ມູນ ການ ຄ້າ ມະນຸດ</Link></li>
              <li><Link href="/about" className="hover:text-foreground">ກ່ຽວກັບ</Link></li>
              <li><Link href="/contact" className="hover:text-foreground">ຕິດຕໍ່</Link></li>
              <li><Link href="/report" className="hover:text-foreground">ລາຍງານ</Link></li>
            </ul>
          </div>

          <div>
            <h3 lang="lo" className="font-lao text-sm font-semibold leading-lao">ສຸກເສີນ</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="tel:191" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Phone aria-hidden className="size-3.5" />
                  <span lang="lo" className="font-lao leading-lao">ຕຳຫຼວດ 191</span>
                </a>
              </li>
              <li>
                <a href="tel:1300" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Phone aria-hidden className="size-3.5" />
                  <span lang="lo" className="font-lao leading-lao">ສາຍດ່ວນຕ້ານການຄ້າມະນຸດ 1300</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p lang="en" className="text-2xs uppercase tracking-wider text-muted-foreground">
            SafeZone · Lao travellers abroad
          </p>
          <Link
            href="/admin"
            lang="en"
            className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            Staff sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
