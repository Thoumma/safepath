"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-fetches the current server component on an interval, so a page rendered on
 * the server stays live without websockets. Used on the case page to follow an
 * open case's moving GPS trail.
 *
 * Refreshes only while `active` — a resolved case has nothing new to pull, and
 * an idle console tab should not poll forever.
 */
export function AutoRefresh({ active, seconds = 15 }: { active: boolean; seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [active, seconds, router]);

  return null;
}
