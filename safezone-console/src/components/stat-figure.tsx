import { ExternalLink } from "lucide-react";
import { CountUp } from "@/components/motion";
import { SOURCES, type BigStat, type SourceId } from "@/lib/trafficking-stats";
import { cn } from "@/lib/utils";

/**
 * A published statistic, presented the SafeZone way: a big tabular numeral that
 * counts up on scroll, a Lao caption, its English annotation, and — always —
 * the citation. The rule above thickens and turns red only when the figure is
 * one to be alarmed by, exactly like the console's StatBlock. Color is
 * information here too.
 */

export function SourceLine({ id, className }: { id: SourceId; className?: string }) {
  const s = SOURCES[id];
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noreferrer"
      lang="en"
      className={cn(
        "annotation group inline-flex items-center gap-1 hover:text-foreground",
        className
      )}
      title={`${s.publication} (${s.year})`}
    >
      <span>
        {s.org} · {s.year}
      </span>
      <ExternalLink aria-hidden className="size-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}

export function BigStatFigure({
  stat,
  dominant = false,
  className,
}: {
  stat: BigStat;
  dominant?: boolean;
  className?: string;
}) {
  const ink =
    stat.tone === "critical"
      ? "text-critical-ink"
      : stat.tone === "high"
        ? "text-high-ink"
        : "text-foreground";

  return (
    <div
      className={cn(
        "border-t-rule pt-3",
        stat.tone === "critical" ? "border-t-critical" : "border-t-border-strong",
        className
      )}
    >
      <div
        className={cn(
          "numeral flex items-baseline",
          // Bigger than the console's StatBlock — the public site leads with the
          // number, so it is allowed to dominate the block it sits in.
          dominant ? "text-hero" : "text-[3rem] leading-none sm:text-[3.75rem]",
          ink
        )}
      >
        <CountUp value={stat.value} decimals={stat.decimals} suffix={stat.suffix} />
      </div>
      <p lang="lo" className="mt-2 font-lao text-sm leading-lao text-muted-foreground">
        {stat.loQualifier && <span className="text-foreground/70">{stat.loQualifier} </span>}
        {stat.loCaption}
      </p>
      <span lang="en" className="annotation mt-0.5 block normal-case tracking-normal text-muted-foreground/80">
        {stat.enCaption}
      </span>
      <SourceLine id={stat.sourceId} className="mt-2" />
    </div>
  );
}
