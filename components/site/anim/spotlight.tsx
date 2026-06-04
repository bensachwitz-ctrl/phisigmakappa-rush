"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Spotlight — a soft radial glow (royal-blue → sky) that follows the cursor
 * within its positioned parent, adding interactive depth to the hero (and,
 * optionally, the features section). Drop it as the first child of a
 * `position: relative` container; it fills the container and tracks pointer
 * movement over it.
 *
 * Reduced-motion-safe AND touch-safe: renders **nothing** unless the device
 * reports a fine pointer that can hover ((hover: hover) and (pointer: fine))
 * and the user has not requested reduced motion. On touch it's a no-op, so
 * there's no stuck glow and no wasted listeners.
 *
 * Purely decorative: aria-hidden + pointer-events-none. Animates opacity +
 * background-position only (the radial is repainted via a spring-smoothed
 * motion template), so it never triggers layout.
 */
export function Spotlight({
  className,
  /** Radius of the glow in px. */
  size = 460,
  /** Core glow color (defaults to royal blue, low opacity). */
  color = "rgba(37,99,235,0.16)",
  /** Secondary tint blended at the edge for a richer falloff. */
  edgeColor = "rgba(56,189,248,0.10)",
}: {
  className?: string;
  size?: number;
  color?: string;
  edgeColor?: string;
}) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);

  // Only enable on devices with a real hovering pointer. Resolved after mount
  // so SSR + first paint render nothing (no hydration mismatch, no flash).
  const [finePointer, setFinePointer] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia?.("(hover: hover) and (pointer: fine)");
    if (!mq) return;
    const apply = () => setFinePointer(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // Pointer position in px within the container; springed so the glow trails
  // the cursor with a premium ease rather than snapping.
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const sx = useSpring(x, { stiffness: 140, damping: 26, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 140, damping: 26, mass: 0.5 });
  const opacity = useMotionValue(0);
  const sOpacity = useSpring(opacity, { stiffness: 120, damping: 24 });

  const onMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "touch") return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      x.set(e.clientX - r.left);
      y.set(e.clientY - r.top);
      opacity.set(1);
    },
    [x, y, opacity]
  );

  const onLeave = React.useCallback(() => opacity.set(0), [opacity]);

  if (reduce || !finePointer) return null;

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn("pointer-events-none absolute inset-0 -z-0 overflow-hidden", className)}
      style={{ opacity: sOpacity }}
    >
      {/* The glow itself: a radial-gradient box translated to follow the cursor.
          Using translate (transform) keeps it on the GPU compositor. */}
      <motion.div
        className="absolute rounded-full will-change-transform"
        style={{
          width: size,
          height: size,
          left: 0,
          top: 0,
          x: sx,
          y: sy,
          translateX: "-50%",
          translateY: "-50%",
          background: `radial-gradient(circle at center, ${color}, ${edgeColor} 45%, transparent 70%)`,
        }}
      />
    </motion.div>
  );
}
