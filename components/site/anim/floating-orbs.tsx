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

const DEFAULT_ORBS: Orb[] = [
  {
    className: "-left-24 -top-24 h-[34rem] w-[34rem]",
    bg: "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.55), transparent 62%)",
    amp: 26,
    dur: 13,
    delay: 0,
  },
  {
    className: "right-[-8rem] top-[12%] h-[28rem] w-[28rem]",
    bg: "radial-gradient(circle at 60% 40%, rgba(34,211,238,0.42), transparent 60%)",
    amp: 34,
    dur: 17,
    delay: 1.2,
  },
  {
    className: "left-[28%] bottom-[-12rem] h-[30rem] w-[30rem]",
    bg: "radial-gradient(circle at 50% 50%, rgba(168,85,247,0.42), transparent 62%)",
    amp: 30,
    dur: 19,
    delay: 0.6,
  },
];

/**
 * FloatingOrbs — absolutely-positioned, blurred gradient orbs (indigo → violet
 * → cyan) that drift continuously for an "alive" depth layer behind hero / CTA
 * content. Purely decorative: aria-hidden, pointer-events-none, and it never
 * affects layout.
 *
 * Reduced-motion-safe: orbs still render (they're static color depth, not
 * essential), but the continuous drift is disabled — they sit still.
 */
export function FloatingOrbs({
  className,
  orbs = DEFAULT_ORBS,
  blur = 90,
}: {
  className?: string;
  orbs?: Orb[];
  blur?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
    >
      {orbs.map((o, i) => {
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
