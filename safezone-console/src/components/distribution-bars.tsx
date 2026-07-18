"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A ranked set of horizontal bars that grow to width on scroll. Swiss to the
 * core — squared bars, hairline baseline, the number stated in words beside the
 * mark. Color is drawn only from the semantic set, so a distribution of
 * exploitation types cannot introduce a hue the console does not already mean.
 *
 * Reduced motion: bars render at full width immediately. The ranking and the
 * numbers are identical with motion off.
 */

export type DistBar = {
  lo: string;
  en: string;
  /** Magnitude that sets the bar width against `max`. */
  value: number;
  /** What to print at the end of the bar, e.g. "42%" or "701". */
  valueText: string;
  tone: "critical" | "high" | "medium" | "low" | "success";
};

const TONE_BAR: Record<DistBar["tone"], string> = {
  critical: "bg-critical",
  high: "bg-high",
  medium: "bg-medium",
  low: "bg-low",
  success: "bg-success",
};

export function DistributionBars({
  bars,
  max,
  className,
}: {
  bars: DistBar[];
  /** The value that maps to a full-width bar. Defaults to the largest value. */
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLUListElement | null>(null);
  const [shown, setShown] = useState(false);
  const [motionOk, setMotionOk] = useState(false);
  const ceiling = max ?? Math.max(...bars.map((b) => b.value), 1);

  useEffect(() => {
    setMotionOk(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!motionOk) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [motionOk]);

  return (
    <ul ref={ref} className={cn("space-y-4", className)}>
      {bars.map((b, i) => (
        <li key={b.en}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 flex-col">
              <span lang="lo" className="truncate font-lao text-sm leading-lao">
                {b.lo}
              </span>
              <span lang="en" className="annotation">
                {b.en}
              </span>
            </span>
            <span className="numeral shrink-0 text-lg tabular-nums">{b.valueText}</span>
          </div>
          {/* Track + fill. The track is a hairline surface; the fill is the mark. */}
          <div className="mt-1.5 h-2 w-full overflow-hidden bg-muted">
            <div
              className={cn("h-full transition-[width] duration-slow ease-out", TONE_BAR[b.tone])}
              style={{
                width: shown ? `${(b.value / ceiling) * 100}%` : "0%",
                transitionDelay: motionOk ? `${i * 90}ms` : undefined,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
