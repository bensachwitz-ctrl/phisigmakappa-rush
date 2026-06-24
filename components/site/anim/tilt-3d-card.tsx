"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
  type MotionStyle,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { useFinePointer } from "@/hooks/use-fine-pointer";

/**
 * Tilt3DCard — a card that rotates in 3D tracking the cursor's position over
 * it (perspective ~1000px) with a cursor-following glare/glow highlight.
 * Snaps back to flat on pointer leave with a soft spring.
 *
 * Reduced-motion-safe: when prefers-reduced-motion is set, it renders a plain
 * static container (no listeners, no transform, no glare).
 *
 * Phone-safe: the entire 3D layer (perspective context, rotateX/rotateY,
 * glare) is DESKTOP-ONLY (fine hovering pointer). On phones/touch it renders a
 * flat static container — no 3D, matching the owner's "no 3D on phone" ask and
 * avoiding the broken-tilt feel on a device that can't hover.
 */
export function Tilt3DCard({
  children,
  className,
  /** Max rotation in degrees at the card's edges. */
  max = 9,
  /** Lift toward the viewer on hover (px of translateZ via scale). */
  glare = true,
  /**
   * Spotlight glow tint that follows the cursor. Defaults to the brand blue
   * (NOT the old indigo/violet that the codebase de-purpled in globals.css:50 /
   * floating-orbs.tsx) so a <Tilt3DCard> without an explicit glareColor never
   * paints off-brand violet.
   */
  glareColor = "rgba(37,99,235,0.22)",
  spring = { stiffness: 220, damping: 22, mass: 0.6 },
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
  glareColor?: string;
  spring?: { stiffness: number; damping: number; mass: number };
  onClick?: () => void;
}) {
  const reduce = useReducedMotion();
  const finePointer = useFinePointer();
  const ref = React.useRef<HTMLDivElement>(null);

  // -0.5 → 0.5 normalized pointer position over the card.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const hovering = useMotionValue(0);

  const rx = useSpring(useTransform(py, [-0.5, 0.5], [max, -max]), spring);
  const ry = useSpring(useTransform(px, [-0.5, 0.5], [-max, max]), spring);
  const lift = useSpring(hovering, { stiffness: 200, damping: 26, mass: 0.5 });
  const scale = useTransform(lift, [0, 1], [1, 1.025]);

  // Glow position in % follows the cursor across the surface.
  const glowX = useTransform(px, [-0.5, 0.5], ["0%", "100%"]);
  const glowY = useTransform(py, [-0.5, 0.5], ["0%", "100%"]);
  const glowOpacity = useTransform(lift, [0, 1], [0, 1]);
  // Cursor-following radial spotlight. useMotionTemplate keeps the x/y reactive
  // while the (static) glare color is interpolated as a plain string.
  const glowBackground = useMotionTemplate`radial-gradient(circle at ${glowX} ${glowY}, ${glareColor}, transparent 55%)`;

  const onMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "touch") return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      px.set((e.clientX - r.left) / r.width - 0.5);
      py.set((e.clientY - r.top) / r.height - 0.5);
    },
    [px, py]
  );

  const onEnter = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "touch") return;
      hovering.set(1);
    },
    [hovering]
  );

  const onLeave = React.useCallback(() => {
    hovering.set(0);
    px.set(0);
    py.set(0);
  }, [hovering, px, py]);

  // Keyboard a11y: when the card is interactive (onClick), it must be reachable
  // and operable by keyboard like a real button. Enter/Space activate it. These
  // props are spread into BOTH the static and the 3D branch below so an
  // interactive Tilt3DCard is never mouse-only. Non-interactive cards (no
  // onClick) get none of these — they stay plain, non-focusable containers.
  const interactiveProps = onClick
    ? {
        role: "button" as const,
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        },
      }
    : {};

  // No reduced motion AND no fine pointer ⇒ flat, static card (phones/touch).
  if (reduce || !finePointer) {
    return (
      <div className={cn(onClick && "cursor-pointer", className)} onClick={onClick} {...interactiveProps}>
        {children}
      </div>
    );
  }

  return (
    <div
      style={{ perspective: 1000 }}
      className={cn("[transform-style:preserve-3d]", onClick && "cursor-pointer", className)}
      onClick={onClick}
      {...interactiveProps}
    >
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        style={
          {
            rotateX: rx,
            rotateY: ry,
            scale,
            transformStyle: "preserve-3d",
          } as MotionStyle
        }
        className="relative h-full w-full will-change-transform"
      >
        {children}

        {glare && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] mix-blend-soft-light"
            style={{ opacity: glowOpacity, background: glowBackground }}
          />
        )}
      </motion.div>
    </div>
  );
}
