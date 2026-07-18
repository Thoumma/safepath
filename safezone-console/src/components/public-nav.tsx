"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Shield, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

/**
 * The public site's top bar. Deliberately NOT the staff sidebar — this is the
 * face a member of the public sees, so it leads with the mission and the Report
 * call-to-action, and tucks staff sign-in away at the end.
 *
 * Lao-primary with a small English annotation, matching the product voice.
 */
const LINKS = [
  { href: "/", lo: "ໜ້າຫຼັກ", en: "Home" },
  { href: "/about", lo: "ກ່ຽວກັບ", en: "About" },
  { href: "/contact", lo: "ຕິດຕໍ່", en: "Contact" },
];

export function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-page items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="grid size-7 place-items-center rounded-sm bg-primary text-primary-foreground">
            <Shield aria-hidden className="size-4" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-base font-bold tracking-tightest">SafeZone</span>
            <span lang="en" className="annotation">
              Stop trafficking
            </span>
          </span>
        </Link>

        {/* Desktop links */}
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-sm px-3 py-2 font-lao text-sm leading-lao transition-colors duration-fast",
                isActive(l.href)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {l.lo}
            </Link>
          ))}
          <Link
            href="/report"
            className="ml-2 inline-flex h-9 items-center gap-1.5 rounded-sm bg-critical px-4 font-lao text-sm font-semibold leading-lao text-critical-foreground transition-colors duration-fast hover:bg-critical/90"
          >
            ລາຍງານ
          </Link>
          <Link
            href="/admin"
            lang="en"
            className="ml-1 rounded-sm px-2 py-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors duration-fast hover:text-foreground"
          >
            Staff
          </Link>
          <ThemeToggle className="ml-1" />
        </nav>

        {/* Mobile trigger */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <Link
            href="/report"
            className="inline-flex h-9 items-center rounded-sm bg-critical px-3 font-lao text-sm font-semibold leading-lao text-critical-foreground"
          >
            ລາຍງານ
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid size-9 place-items-center rounded-sm border border-border text-muted-foreground hover:text-foreground"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {open && (
        <nav className="border-t border-border bg-background md:hidden">
          <ul className="mx-auto max-w-page px-4 py-2 sm:px-6">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-sm px-2 py-3 font-lao leading-lao",
                    isActive(l.href) ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {l.lo}
                  <span lang="en" className="annotation">
                    {l.en}
                  </span>
                </Link>
              </li>
            ))}
            <li className="mt-1 flex items-center justify-between border-t border-border px-2 pt-3">
              <Link
                href="/admin"
                lang="en"
                onClick={() => setOpen(false)}
                className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Staff sign in
              </Link>
              <ThemeToggle />
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
