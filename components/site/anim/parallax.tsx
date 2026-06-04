"use client";

import * as React from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
  type MotionStyle,
} from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Parallax / ScrollFloat — wraps children and translates (and optionally
 * rotates / scales) them based on the element's scroll progress through the
 * viewport. Use for layered hero orbs and quiet section depth.
 *
 * Reduced-motion-safe: renders a plain static wrapper when the user prefers
 * reduced motion. Performance-safe: only transform/opacity, spring-smoothed,
 * and offscreen elements simply sit at their resting transform.
 */
export function Parallax({
  children,
  className,
  /** Total vertical travel in px across the scroll range (sign sets direction). */
  translateY = 80,
  /** Optional horizontal travel in px. */
  translateX = 0,
  /** Optional rotation in degrees across the range. */
  rotate = 0,
  /** Optional scale endpoints. */
  scaleFrom,
  scaleTo,
  /** Optional opacity fade endpoints. */
  fade = false,
  /** Scroll offset mapping (framer useScroll offset). */
  offset = ["start end", "end start"] as const,
  smooth = true,
  style,
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  translateY?: number;
  translateX?: number;
  rotate?: number;
  scaleFrom?: number;
  scaleTo?: number;
  fade?: boolean;
  // framer offset tuple — kept loose so callers can pass any valid pair.
  offset?: any;
  smooth?: boolean;
  style?: MotionStyle;
  as?: "div" | "span";
  "aria-hidden"?: boolean | "true" | "false";
}) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: ref, offset });
  const p = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 30,
    restDelta: 0.001,
  });
  const prog = smooth ? p : scrollYProgress;

  const y = useTransform(prog, [0, 1], [translateY, -translateY]);
  const x = useTransform(prog, [0, 1], [translateX, -translateX]);
  const rot = useTransform(prog, [0, 1], [-rotate, rotate]);
  const scl = useTransform(prog, [0, 1], [scaleFrom ?? 1, scaleTo ?? 1]);
  const opacity = useTransform(prog, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);

  const MotionTag = Tag === "span" ? motion.span : motion.div;

  if (reduce) {
    const StaticTag = Tag === "span" ? "span" : "div";
    return (
      <StaticTag ref={ref as any} className={className} {...rest}>
        {children}
      </StaticTag>
    );
  }

  return (
    <MotionTag
      ref={ref as any}
      className={cn("will-change-transform", className)}
      style={
        {
          y,
          ...(translateX ? { x } : {}),
          ...(rotate ? { rotate: rot } : {}),
          ...(scaleFrom != null || scaleTo != null ? { scale: scl } : {}),
          ...(fade ? { opacity } : {}),
          ...style,
        } as MotionStyle
      }
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

/**
 * ScrollProgressBar — a thin gradient bar pinned at the very top of the page
 * that fills left→right as the user scrolls the whole document.
 *
 * Reduced-motion-safe: still renders (it's an orientation aid, not decoration)
 * but framer disables the spring smoothing under reduced motion automatically;
 * we also drop the spring so it tracks scroll 1:1 with no easing.
 */
export function ScrollProgressBar({
  className,
  height = 3,
}: {
  className?: string;
  height?: number;
}) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      className={cn(
        "fixed inset-x-0 top-0 z-[60] origin-left bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400",
        className
      )}
      style={{ height, scaleX: reduce ? scrollYProgress : scaleX }}
    />
  );
}
