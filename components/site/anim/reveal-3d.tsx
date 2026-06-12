"use client";

import * as React from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { useFinePointer } from "@/hooks/use-fine-pointer";

/* Spring-flavoured easing from the design-motion principles:
   cubic-bezier(0.16, 1, 0.3, 1) — a confident, slightly-overshooting entrance. */
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* Desktop variant includes the subtle rotateX "settle" (a 3D tip-up). On phones
   we keep the clean fade + translate but drop the 3D rotateX/perspective — the
   owner's "no 3D on phone" ask. Both variants share the same easing + timing so
   the entrance still feels premium on mobile, just flat. */
const itemVariants3D: Variants = {
  hidden: { opacity: 0, y: 26, rotateX: -8, transformPerspective: 800 },
  show: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transformPerspective: 800,
    transition: { duration: 0.7, ease: EASE_OUT_EXPO },
  },
};

const itemVariantsFlat: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_OUT_EXPO },
  },
};

/**
 * Reveal3D — scroll-triggered staggered entrance. Fades + translates up + does
 * a slight rotateX "settle". Fires once when it enters view (useInView, once).
 *
 * - As a single wrapper: animates its children container in.
 * - With `stagger`: each direct child of <Reveal3DItem> reveals in sequence.
 *
 * Reduced-motion-safe: renders fully visible, no transform, no transition.
 * SSR-safe: framer renders the `hidden` state markup server-side, then animates
 * post-hydration; content is present in the DOM (only visually offset), so it
 * never blocks first paint or hides text from crawlers.
 */
export function Reveal3D({
  children,
  className,
  delay = 0,
  /** Stagger gap (seconds) between children when used as a list container. */
  stagger,
  /** Travel distance override (px). */
  y = 26,
  once = true,
  amount = 0.25,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
  y?: number;
  once?: boolean;
  amount?: number;
  as?: "div" | "section" | "ul" | "li";
}) {
  const reduce = useReducedMotion();
  const finePointer = useFinePointer();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount });
  // Safety net — never leave content stuck at opacity:0 if the IntersectionObserver
  // doesn't fire (no-JS, observer quirks, off-viewport composite renders). After a
  // grace period the reveal plays regardless. Mirrors components/site/reveal.tsx.
  const [forceShow, setForceShow] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setForceShow(true), 1500);
    return () => clearTimeout(t);
  }, []);
  const visible = inView || forceShow;

  const MotionTag =
    Tag === "section"
      ? motion.section
      : Tag === "ul"
      ? motion.ul
      : Tag === "li"
      ? motion.li
      : motion.div;

  if (reduce) {
    const StaticTag = Tag as any;
    return (
      <StaticTag ref={ref as any} className={className}>
        {children}
      </StaticTag>
    );
  }

  // Container that orchestrates staggered children.
  if (stagger != null) {
    return (
      <MotionTag
        ref={ref as any}
        className={className}
        initial="hidden"
        animate={visible ? "show" : "hidden"}
        variants={{
          hidden: {},
          show: {
            transition: { staggerChildren: stagger, delayChildren: delay },
          },
        }}
      >
        {children}
      </MotionTag>
    );
  }

  // Single element reveal. Desktop tips up in 3D (rotateX); phone fades + lifts
  // flat (no 3D) per the "no 3D on phone" ask.
  return (
    <MotionTag
      ref={ref as any}
      className={cn("will-change-transform", className)}
      initial="hidden"
      animate={visible ? "show" : "hidden"}
      variants={
        finePointer
          ? {
              hidden: { opacity: 0, y, rotateX: -8, transformPerspective: 800 },
              show: {
                opacity: 1,
                y: 0,
                rotateX: 0,
                transformPerspective: 800,
                transition: { duration: 0.7, ease: EASE_OUT_EXPO, delay },
              },
            }
          : {
              hidden: { opacity: 0, y },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.7, ease: EASE_OUT_EXPO, delay },
              },
            }
      }
    >
      {children}
    </MotionTag>
  );
}

/**
 * Reveal3DItem — a single staggered child. Place inside a <Reveal3D stagger=…>
 * container; it inherits the container's orchestration and reveals in turn.
 */
export function Reveal3DItem({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const reduce = useReducedMotion();
  const finePointer = useFinePointer();
  const MotionTag = Tag === "li" ? motion.li : motion.div;

  if (reduce) {
    const StaticTag = Tag as any;
    return <StaticTag className={className}>{children}</StaticTag>;
  }

  return (
    <MotionTag
      className={cn("will-change-transform [transform-style:preserve-3d]", className)}
      variants={finePointer ? itemVariants3D : itemVariantsFlat}
    >
      {children}
    </MotionTag>
  );
}
