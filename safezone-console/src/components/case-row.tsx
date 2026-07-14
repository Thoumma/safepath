import Link from "next/link";
import { MapPin } from "lucide-react";
import { SeverityBadge, StatusBadge } from "@/components/tags";
import { SEVERITY, PARTNER } from "@/lib/constants";
import { agoLao, initials, cn } from "@/lib/utils";
import type { CaseListItem } from "@/lib/types";

/**
 * The core triage object. Severity is carried by the weight of the left rule
 * and the weight of the type — not by a pastel pill the officer has to stop
 * and read. It must be legible in the static state, from across a room.
 *
 * The pulse is reserved: a CRITICAL case that nobody has picked up yet. Once
 * it moves to IN_PROGRESS it stops. A console that pulses all the time is a
 * console nobody looks at.
 */
export function CaseRow({ c }: { c: CaseListItem }) {
  const sev = SEVERITY[c.severity];
  const resolved = c.status === "RESOLVED";
  const unclaimed = c.severity === "CRITICAL" && c.status === "NEW";

  return (
    <Link
      href={`/cases/${c.id}`}
      className={cn(
        "group relative flex items-center gap-3 border border-border bg-card px-3 py-2.5",
        "transition-colors duration-fast hover:border-border-strong hover:bg-muted",
        sev.bar,
        // Resolved cases desaturate rather than merely fade — they recede from
        // the color channel entirely, which is where triage happens.
        resolved && "opacity-70 grayscale"
      )}
    >
      {/* The unclaimed-critical marker. Under prefers-reduced-motion the
          animation is killed globally and this stays a solid red rule. */}
      {unclaimed && (
        <span
          aria-hidden
          className="absolute -left-[4px] top-0 h-full w-[4px] animate-pulse-rule bg-critical"
        />
      )}

      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-sm border border-border bg-muted text-sm font-bold text-foreground"
      >
        {initials(c.citizenName)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("font-lao text-base leading-lao", unclaimed ? "font-bold" : "font-semibold")}>
            {c.citizenName}
          </span>
          <SeverityBadge value={c.severity} />
          <StatusBadge value={c.status} />
        </div>

        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
          <span className="truncate">{c.type}</span>
          <span aria-hidden>·</span>
          <MapPin aria-hidden className="size-3 shrink-0" />
          <span className="truncate">{[c.city, c.country].filter(Boolean).join(", ")}</span>
          {c.routedTo && (
            <>
              <span aria-hidden>·</span>
              <span lang="lo" className="shrink-0 font-lao text-muted-foreground">
                → {PARTNER[c.routedTo].lo}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Elapsed time and ref number: tabular, monospaced, right-aligned so the
          column reads as a column. This is what the officer says out loud on
          the phone. */}
      <div className="shrink-0 text-right">
        <div className={cn("font-mono text-sm font-semibold tabular-nums", unclaimed && "text-critical-ink")}>
          {agoLao(c.createdAt)}
        </div>
        <div className="font-mono text-2xs text-muted-foreground">{c.refNo}</div>
      </div>
    </Link>
  );
}
