"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * PhraseFlip — cross-fades through an array of COMPLETE phrases, then settles
 * on a final string. Unlike a character-by-character typewriter, every frame
 * shows a whole, legible phrase — so a screenshot or glance never catches a
 * half-typed word (which reads as "clipped"). This is the "tagline flips
 * through the functions, smooth" motion the owner asked for.
 *
 * SSR-safe: renders `ssrText` (or the settle/longest phrase) server-side and on
 * the first client paint so the headline hydrates with real text (good LCP) and
 * never flashes empty. The flip only starts after mount inside useEffect.
 *
 * Reduced-motion-safe: when the user prefers reduced motion we skip the cycle
 * entirely and render `settleText` (or the last phrase) statically.
 *
 * No layout shift: an invisible copy of the longest phrase reserves the box
 * height; the animated line is absolutely positioned over it.
 */
export function PhraseFlip({
  phrases,
  /** After cycling through `phrases` once, flip to this string and stop
   *  (the "brand promise" landing). Omit to loop forever. */
  settleText,
  /** Text rendered server-side / pre-hydration. Defaults to settleText, else
   *  the longest phrase, so the reserved line-height never shifts. */
  ssrText,
  /** ms each phrase is held fully visible before flipping to the next. */
  holdTime = 2000,
  className,
  /** Applied to the element that CONTAINS the text — use for gradient/clip
   *  styling (e.g. "gs-gradient-text") so it lands on the text-bearing node. */
  textClassName,
  as: Tag = "span",
}: {
  phrases: string[];
  settleText?: string;
  ssrText?: string;
  holdTime?: number;
  className?: string;
  textClassName?: string;
  as?: "span" | "div";
}) {
  const reduce = useReducedMotion();

  const queue = React.useMemo(
    () => (settleText ? [...phrases, settleText] : phrases),
    [phrases, settleText]
  );
  const longest = React.useMemo(
    () => queue.reduce((a, b) => (b.length >= a.length ? b : a), ""),
    [queue]
  );
  const fallback = ssrText ?? settleText ?? longest;

  const [mounted, setMounted] = React.useState(false);
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!mounted || reduce) return;
    // Stop once we reach the final settle phrase (last item when settleText set).
    if (settleText != null && idx >= queue.length - 1) return;
    const id = setTimeout(
      () => setIdx((i) => (i + 1) % queue.length),
      holdTime
    );
    return () => clearTimeout(id);
  }, [mounted, reduce, idx, queue.length, settleText, holdTime]);

  // Reduced motion / pre-mount: render the settle promise statically, no motion.
  if (reduce || !mounted) {
    return <Tag className={cn(className, textClassName)}>{fallback}</Tag>;
  }

  const current = queue[idx] ?? fallback;

  return (
    <Tag className={cn("relative inline-block align-bottom", className)}>
      {/* Screen-reader-only stable label; the animated copy below is aria-hidden
          so AT users hear the brand promise once, not every flip. */}
      <span className="sr-only">{settleText ?? fallback}</span>
      {/* Invisible height/width reserver so the line never reflows on flip. */}
      <span aria-hidden="true" className="invisible block whitespace-pre-wrap">
        {longest}
      </span>
      {/* Default (sync) mode, not "wait": the exiting phrase fades out WHILE the
          entering one fades in. Both are absolute inset-0 so they stack and
          cross-fade with no empty gap between phrases (mode="wait" would blank
          the line for the exit duration — reads as a flicker). */}
      <AnimatePresence initial={false}>
        <motion.span
          key={idx}
          aria-hidden="true"
          className={cn("absolute inset-0 block", textClassName)}
          initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          {current}
        </motion.span>
      </AnimatePresence>
    </Tag>
  );
}
