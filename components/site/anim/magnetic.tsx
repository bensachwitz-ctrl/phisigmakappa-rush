"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
  type MotionStyle,
} from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Magnetic — wraps any element (e.g. a <Button asChild>) and translates it
 * slightly toward the cursor on hover with a spring, snapping back on leave.
 * The inner content can also shift a touch *further* for a parallax "pull".
 *
 * Reduced-motion-safe: renders an inert wrapper (no listeners, no transform)
 * when prefers-reduced-motion is set.
 *
 * Renders a real, focusable element inside — keyboard users get the normal
 * link/button with zero magnetic behaviour, so it never harms accessibility.
 */
export function Magnetic({
  children,
  className,
  /** How far (px) the element drifts toward the cursor at the edge of range. */
  strength = 18,
  /** Extra inner drift for a subtle parallax between wrapper and label. */
  innerStrength = 6,
  /** Radius (px) around the element where the pull engages. */
  radius = 90,
  spring = { stiffness: 260, damping: 18, mass: 0.5 },
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  innerStrength?: number;
  radius?: number;
  spring?: { stiffness: number; damping: number; mass: number };
}) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);

  // Inner content drifts a little extra in the same direction.
  const ix = useSpring(useDerived(x, innerStrength / strength), spring);
  const iy = useSpring(useDerived(y, innerStrength / strength), spring);

  const onMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "touch") return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const f = Math.max(0, 1 - dist / (radius + Math.max(r.width, r.height) / 2));
      x.set((dx / (r.width / 2 || 1)) * strength * f);
      y.set((dy / (r.height / 2 || 1)) * strength * f);
    },
    [radius, strength, x, y]
  );

  const reset = React.useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  if (reduce) {
    return <div className={cn("inline-flex", className)}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      onPointerEnter={onMove}
      style={{ x: sx, y: sy } as MotionStyle}
      className={cn("relative inline-flex will-change-transform", className)}
    >
      {/* w-full so a stretched Magnetic (equal-width CTA pairs) passes its
          width down — inline-flex alone shrank to content and silently broke
          the w-full chain between wrapper and child button. Harmless when the
          wrapper is natural-width (100% of shrink-to-fit = the same width). */}
      <motion.div style={{ x: ix, y: iy } as MotionStyle} className="inline-flex w-full">
        {children}
      </motion.div>
    </motion.div>
  );
}

/* Scales a motion value by a constant factor (for the inner parallax layer). */
function useDerived(mv: ReturnType<typeof useMotionValue<number>>, factor: number) {
  const out = useMotionValue(0);
  React.useEffect(() => {
    const unsub = mv.on("change", (v) => out.set(v * factor));
    return unsub;
  }, [mv, out, factor]);
  return out;
}
