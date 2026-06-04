"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Orb = {
  /** CSS position, any of top/left/right/bottom + size, as Tailwind classes. */
  className: string;
  /** Gradient background (indigo / violet / cyan family). */
  bg: string;
  /** Drift amplitude (px) and duration (s) for the idle float. */
  amp?: number;
  dur?: number;
  delay?: number;
};

/* Placement / motion for the three default orbs. The fill colors are layered
   in separately (see DEFAULT_ORB_COLORS / the `colors` prop) so a caller can
   recolor the orbs to the chapter brand without re-specifying geometry. */
const DEFAULT_ORB_LAYOUT: Omit<Orb, "bg">[] = [
  { className: "-left-24 -top-24 h-[34rem] w-[34rem]", amp: 26, dur: 13, delay: 0 },
  { className: "right-[-8rem] top-[12%] h-[28rem] w-[28rem]", amp: 34, dur: 17, delay: 1.2 },
  { className: "left-[28%] bottom-[-12rem] h-[30rem] w-[30rem]", amp: 30, dur: 19, delay: 0.6 },
];

/* The original platform palette (indigo → cyan → violet). Used when no
   `colors` prop is supplied, so marketing-landing renders exactly as before. */
const DEFAULT_ORB_COLORS = [
  "rgba(99,102,241,0.55)",
  "rgba(34,211,238,0.42)",
  "rgba(168,85,247,0.42)",
];

/* The soft-edged radial used for each orb: focal point + transparent fade stop.
   These reproduce the ORIGINAL three default orbs byte-for-byte (so existing
   call sites are visually unchanged), and work just as well for any CSS color a
   chapter passes (hex / var(--brand-primary)) — a solid brand color still fades
   cleanly to transparent. */
const ORB_RADIALS = [
  { focus: "30% 30%", stop: "62%" },
  { focus: "60% 40%", stop: "60%" },
  { focus: "50% 50%", stop: "62%" },
] as const;

function orbFromColor(color: string, i: number): Orb {
  const { focus, stop } = ORB_RADIALS[i % ORB_RADIALS.length];
  return {
    ...DEFAULT_ORB_LAYOUT[i % DEFAULT_ORB_LAYOUT.length],
    bg: `radial-gradient(circle at ${focus}, ${color}, transparent ${stop})`,
  };
}

const DEFAULT_ORBS: Orb[] = DEFAULT_ORB_COLORS.map(orbFromColor);

/**
 * FloatingOrbs — absolutely-positioned, blurred gradient orbs (indigo → violet
 * → cyan) that drift continuously for an "alive" depth layer behind hero / CTA
 * content. Purely decorative: aria-hidden, pointer-events-none, and it never
 * affects layout.
 *
 * Reduced-motion-safe: orbs still render (they're static color depth, not
 * essential), but the continuous drift is disabled — they sit still.
 *
 * Recoloring: pass `colors` (any CSS colors — hex, rgba, or
 * `var(--brand-primary)` etc.) to tint the three default orbs to a chapter's
 * brand while keeping the original placement + drift. Omit it and the orbs
 * render in the platform indigo → cyan → violet palette exactly as before, so
 * existing call sites (marketing-landing) are unaffected. An explicit `orbs`
 * array still wins over `colors` for full control.
 */
export function FloatingOrbs({
  className,
  orbs,
  colors,
  blur = 90,
}: {
  className?: string;
  orbs?: Orb[];
  /** Override just the orb fill colors (chapter brand). Keeps default geometry. */
  colors?: string[];
  blur?: number;
}) {
  const reduce = useReducedMotion();

  // Precedence: explicit `orbs` › `colors` (recolored defaults) › platform default.
  const resolvedOrbs = React.useMemo<Orb[]>(() => {
    if (orbs) return orbs;
    if (colors && colors.length > 0) return colors.map(orbFromColor);
    return DEFAULT_ORBS;
  }, [orbs, colors]);

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
    >
      {resolvedOrbs.map((o, i) => {
        const amp = o.amp ?? 28;
        return (
          <motion.div
            key={i}
            className={cn("absolute rounded-full", o.className)}
            style={{ background: o.bg, filter: `blur(${blur}px)` }}
            initial={false}
            animate={
              reduce
                ? undefined
                : {
                    y: [0, -amp, amp * 0.4, 0],
                    x: [0, amp * 0.5, -amp * 0.4, 0],
                    scale: [1, 1.06, 0.97, 1],
                  }
            }
            transition={
              reduce
                ? undefined
                : {
                    duration: o.dur ?? 16,
                    delay: o.delay ?? 0,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
            }
          />
        );
      })}
    </div>
  );
}
