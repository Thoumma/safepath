"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * An isotype pictograph: a row of person-glyphs, a share of them highlighted.
 *
 * This is the emotive heart of the public site, and it is deliberately built
 * from the *Swiss* tradition rather than against it — Otto Neurath's ISOTYPE
 * (a repeated human figure standing for a quantity) is the same International
 * Typographic lineage the whole console is drawn from. So "71 of every 100
 * victims are women and girls" becomes 100 figures, 71 in signal red — a
 * statistic you can feel at a glance, with zero decoration and no stock photo
 * of a real person's worst day.
 *
 * The highlighted figures fill in left-to-right when the block scrolls into
 * view. With reduced motion they are simply already filled — the picture is
 * identical, it just doesn't animate there.
 */

// A plain standing figure — head + shoulders. Neutral, non-gendered,
// dignity-preserving: a symbol for "a person", never a depiction of one.
const HEAD = { cx: 12, cy: 6.5, r: 3.4 };
const BODY_PATH = "M4.5 22c0-4.2 3.2-7.5 7.5-7.5s7.5 3.3 7.5 7.5H4.5z";

const TONE_FILL: Record<string, string> = {
  critical: "text-critical",
  high: "text-high-ink",
  medium: "text-medium",
  success: "text-success",
};

export function Pictograph({
  total = 100,
  filled,
  columns = 20,
  tone = "critical",
  className,
  label,
}: {
  /** Number of glyphs drawn (the denominator). */
  total?: number;
  /** How many are highlighted (the numerator). */
  filled: number;
  columns?: number;
  tone?: "critical" | "high" | "medium" | "success";
  className?: string;
  /** Accessible summary, e.g. "71 of every 100 victims are women and girls". */
  label: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [reveal, setReveal] = useState(false);
  const [motionOk, setMotionOk] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMotionOk(!mq.matches);
  }, []);

  useEffect(() => {
    if (!motionOk) {
      setReveal(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setReveal(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [motionOk]);

  const glyphs = Array.from({ length: total });

  return (
    <div
      ref={ref}
      className={cn("grid gap-1", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      role="img"
      aria-label={label}
    >
      {glyphs.map((_, i) => {
        const isFilled = i < filled;
        // Stagger the fill so it sweeps across the block over ~700ms.
        const delay = motionOk ? Math.round((i / Math.max(filled, 1)) * 700) : 0;
        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            aria-hidden
            className={cn(
              "h-full w-full transition-[color,opacity] duration-normal ease-out",
              isFilled && reveal ? TONE_FILL[tone] : "text-border-strong/25",
              isFilled && reveal ? "opacity-100" : "opacity-100"
            )}
            style={isFilled && motionOk ? { transitionDelay: `${delay}ms` } : undefined}
          >
            <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill="currentColor" />
            <path d={BODY_PATH} fill="currentColor" />
          </svg>
        );
      })}
    </div>
  );
}
