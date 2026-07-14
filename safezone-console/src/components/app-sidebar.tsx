"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Siren, Users, BarChart3, Shield, LogOut } from "lucide-react";
import { NAV } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ICONS = { LayoutDashboard, Siren, Users, BarChart3 } as const;

/**
 * The left rule of the grid.
 *
 * Active state is a filled navy block with a hard edge, not a rounded pill —
 * on a rigid grid, a rounded highlight floating inside a square column reads
 * as an accident. On mobile this collapses to a bottom tab bar (44px targets);
 * a sidebar that scrolls off a phone is a navigation that does not exist.
 */
export function AppSidebar({
  staffName,
  scopeLabel,
  newCount,
}: {
  staffName: string;
  scopeLabel: string;
  newCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const items = NAV.map((item) => {
    const Icon = ICONS[item.icon];
    const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
    return { ...item, Icon, active };
  });

  return (
    <>
      {/* Desktop: persistent column */}
      <aside className="hidden h-screen w-sidebar shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="border-b border-border px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-sm bg-primary text-primary-foreground">
              <Shield aria-hidden className="size-4" />
            </span>
            <span className="text-base font-bold tracking-tightest">SafeZone</span>
          </div>
          <div className="mt-1 pl-9">
            <span lang="en" className="annotation">
              Response Console
            </span>
          </div>
        </div>

        <nav className="flex-1 p-2">
          <ul className="space-y-px">
            {items.map(({ href, lo, en, Icon, active }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-sm px-3 py-2.5 transition-colors duration-fast",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon aria-hidden className="size-4 shrink-0" />
                  <span className="flex min-w-0 flex-col">
                    <span lang="lo" className="truncate font-lao text-sm leading-lao">
                      {lo}
                    </span>
                    <span
                      lang="en"
                      className={cn(
                        "annotation",
                        active && "text-primary-foreground/70"
                      )}
                    >
                      {en}
                    </span>
                  </span>
                  {href === "/inbox" && newCount > 0 && (
                    <span className="ml-auto grid min-w-5 shrink-0 place-items-center rounded-sm bg-critical px-1 py-0.5 font-mono text-2xs font-bold tabular-nums text-critical-foreground">
                      {newCount}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-border p-3">
          <div lang="lo" className="font-lao text-xs font-semibold leading-lao text-foreground">
            {scopeLabel}
          </div>
          <div className="truncate text-xs text-muted-foreground">{staffName}</div>
          <button
            onClick={signOut}
            className="mt-2 flex items-center gap-1.5 rounded-sm text-xs text-muted-foreground transition-colors duration-fast hover:text-critical-ink"
          >
            <LogOut aria-hidden className="size-3.5" />
            <span lang="lo" className="font-lao">
              ອອກ ຈາກ ລະບົບ
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile: bottom tab bar. 44px minimum touch targets. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card md:hidden">
        <ul className="grid grid-cols-4">
          {items.map(({ href, lo, Icon, active }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-0.5",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {/* Active marker is a rule across the top of the tab, echoing
                    the rules used everywhere else. */}
                {active && <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-primary" />}
                <Icon aria-hidden className="size-5" />
                <span lang="lo" className="font-lao text-2xs leading-none">
                  {lo}
                </span>
                {href === "/inbox" && newCount > 0 && (
                  <span className="absolute right-[22%] top-2 grid min-w-4 place-items-center rounded-sm bg-critical px-1 font-mono text-[10px] font-bold tabular-nums text-critical-foreground">
                    {newCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
