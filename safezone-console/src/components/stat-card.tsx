import { Eyebrow } from "@/components/bilingual";
import { cn } from "@/lib/utils";

/**
 * A stat is a rule, a label, and a number — not a card.
 *
 * Swiss scale contrast does the work: the eyebrow is 11px, the numeral is
 * 40px (or 72px when dominant). The old version rendered the label and the
 * value at nearly the same size inside a rounded box, which is why the
 * dashboard had no focal point.
 *
 * `dominant` is reserved for the New-SOS count. Exactly one element per screen
 * may use it — that is the whole point of a hierarchy.
 */
export function StatBlock({
  lo,
  en,
  value,
  unit,
  tone = "neutral",
  dominant = false,
  live = false,
  className,
}: {
  lo: string;
  en: string;
  value: string | number;
  unit?: string;
  tone?: "neutral" | "critical" | "success";
  dominant?: boolean;
  live?: boolean;
  className?: string;
}) {
  const isAlarming = tone === "critical" && Number(value) > 0;

  return (
    <div
      className={cn(
        // The top rule is the structure. It thickens and turns red only when
        // there is something to be alarmed about.
        "border-t-rule pt-3",
        isAlarming ? "border-t-critical" : "border-t-border-strong",
        className
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span lang="lo" className="font-lao text-xs leading-lao text-muted-foreground">
          {lo}
        </span>
        <Eyebrow>{en}</Eyebrow>
      </div>

      <div
        className={cn(
          "numeral mt-2 flex items-baseline gap-1.5",
          dominant ? "text-hero" : "text-stat",
          isAlarming && "text-critical-ink",
          tone === "success" && "text-success-ink"
        )}
        // An arriving case must be announced, not merely animated.
        aria-live={live ? "polite" : undefined}
      >
        {value}
        {unit && <span className="text-lg font-medium text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}
