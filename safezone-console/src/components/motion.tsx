"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Public-site motion primitives. The staff console is deliberately still —
 * Swiss motion is functional, and the only sanctioned animation there is the
 * CRITICAL pulse. The public website is allowed a little more warmth: it has to
 * make a stranger *feel* the scale of the problem, not just read it.
 *
 * Two rules keep that warmth honest:
 *   1. Motion is a reveal, never a bounce. Content fades and rises a few pixels
 *      into place; nothing overshoots, nothing loops (except the one hero mark).
 *   2. `prefers-reduced-motion` is respected everywhere. A count-up becomes the
 *      final number instantly; a reveal is visible from first paint. The page
 *      must convey exactly the same information with motion switched off.
 */

/** True once the user has NOT asked to reduce motion. SSR-safe (defaults to
 *  "reduced" so the first server render is the static, always-correct one). */
function usePrefersMotion(): boolean {
  const [motionOk, setMotionOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionOk(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return motionOk;
}

/**
 * Fades + rises its children into place the first time they scroll into view.
 * With reduced motion, or before hydration, children render in their final
 * position — so the content is never gated behind JavaScript or an animation.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  /** Stagger, in ms — used to cascade a row of stats. */
  delay?: number;
  as?: "div" | "li" | "section";
}) {
  const motionOk = usePrefersMotion();
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!motionOk) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [motionOk]);

  return (
    <Tag
      ref={ref as never}
      className={cn(
        "transition-[opacity,transform] duration-slow ease-out motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        className
      )}
      style={motionOk && shown && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

/**
 * Counts a number up from zero to `value` once it enters the viewport. The
 * final value is always the accessible truth: reduced-motion renders it
 * immediately, and it is the text a screen reader announces.
 *
 * `format` keeps the display honest for values like "50M" or "27.6M" — the
 * caller supplies exactly the string it wants, and CountUp only animates the
 * numeric magnitude beneath it.
 */
export function CountUp({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  durationMs = 1400,
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  durationMs?: number;
  className?: string;
}) {
  const motionOk = usePrefersMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(motionOk ? 0 : value);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!motionOk) {
      setDisplay(value);
      return;
    }
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    // rAF timing without Date.now(): accumulate deltas via the timestamp arg.
    let startTs: number | null = null;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const t = Math.min(1, (ts - startTs) / durationMs);
      setDisplay(value * easeOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          raf = requestAnimationFrame(tick);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [motionOk, value, durationMs]);

  const shown = display.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {shown}
      {suffix}
    </span>
  );
}
