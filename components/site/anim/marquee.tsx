"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Marquee — infinite horizontal scroll of its children (e.g. a strip of Greek
 * glyphs ΑΒΓΔ…ΩΦΣΚ or org names). Duplicates the track so the loop is seamless,
 * pauses on hover, and fades at both edges.
 *
 * Pure CSS transform animation (no JS rAF), so it's cheap and the browser's
 * prefers-reduced-motion handling in globals.css freezes it automatically.
 * We ALSO gate it in JS so reduced-motion users get a static, centered row
 * with no duplicated/clipped content.
 *
 * Decorative: the strip is aria-hidden so screen readers don't read a wall of
 * repeated glyphs.
 */
export function Marquee({
  items,
  className,
  /** Seconds for one full loop. Larger = slower. */
  duration = 32,
  /** Reverse direction. */
  reverse = false,
  /** Gap between items (Tailwind gap value as a className suffix, e.g. "gap-10"). */
  gapClassName = "gap-12",
  itemClassName,
}: {
  items: React.ReactNode[];
  className?: string;
  duration?: number;
  reverse?: boolean;
  gapClassName?: string;
  itemClassName?: string;
}) {
  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => {
    const m = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!m) return;
    setReduce(m.matches);
    const on = () => setReduce(m.matches);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);

  const row = (key: string, ariaHidden: boolean) => (
    <ul
      key={key}
      aria-hidden={ariaHidden || undefined}
      className={cn(
        "flex shrink-0 items-center justify-around",
        gapClassName,
        reduce ? "flex-wrap justify-center" : "min-w-full"
      )}
    >
      {items.map((it, i) => (
        <li key={i} className={cn("flex items-center", itemClassName)}>
          {it}
        </li>
      ))}
    </ul>
  );

  // Reduced motion: a single static, wrapped, centered row.
  if (reduce) {
    return (
      <div
        className={cn(
          "w-full overflow-hidden",
          "[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]",
          className
        )}
      >
        {row("static", false)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex w-full overflow-hidden",
        "[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]",
        className
      )}
    >
      <div
        className={cn(
          "flex w-max",
          gapClassName,
          "marquee-track group-hover:[animation-play-state:paused]"
        )}
        style={{
          // Local animation so we don't depend on a globals.css keyframe.
          animationName: "gs-marquee",
          animationDuration: `${duration}s`,
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {row("a", true)}
        {row("b", true)}
      </div>

      {/* Scoped keyframes — translate one full row width (-50% of the 2-row track). */}
      <style>{`
        @keyframes gs-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none !important; transform: none !important; }
        }
      `}</style>
    </div>
  );
}
