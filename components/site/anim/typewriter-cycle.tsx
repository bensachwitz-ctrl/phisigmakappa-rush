"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * TypewriterCycle — types and deletes through an array of phrases with a
 * blinking caret, then (optionally) settles on a final string.
 *
 * SSR-safe: renders a stable string server-side and on the very first client
 * paint (the longest phrase by default, or an explicit `ssrText`), so the
 * headline never hydrates from an empty node and LCP has real text. The
 * typing effect only kicks in *after* mount inside useEffect.
 *
 * Reduced-motion-safe: when the user prefers reduced motion we skip the
 * animation entirely and render `settleText` (or the last phrase) statically
 * with no caret.
 */
export function TypewriterCycle({
  phrases,
  /** If provided, after cycling through `phrases` once the component types this
   *  string and stops (the "brand promise" landing). Omit to loop forever. */
  settleText,
  /** Text rendered server-side / pre-hydration. Defaults to the longest of
   *  phrases+settleText so the reserved line-height never shifts (no CLS). */
  ssrText,
  typeSpeed = 58,
  deleteSpeed = 32,
  holdTime = 1400,
  settleHoldDelay = 320,
  className,
  caretClassName,
  /** Applied to the element that actually CONTAINS the typed text. Use this for
   *  gradient/clip text (e.g. "gs-gradient-text") — putting such a class on a
   *  PARENT wrapper fails because background-clip:text can't reach nested text,
   *  which renders the typed line invisible. */
  textClassName,
  /** Wrap the visible text in this element. Default span (inline). */
  as: Tag = "span",
}: {
  phrases: string[];
  settleText?: string;
  ssrText?: string;
  typeSpeed?: number;
  deleteSpeed?: number;
  holdTime?: number;
  settleHoldDelay?: number;
  className?: string;
  caretClassName?: string;
  textClassName?: string;
  as?: "span" | "div";
}) {
  const reduce = useReducedMotion();

  // Longest candidate string — used as the SSR/pre-hydration text and as an
  // invisible width-reserver so the line never reflows mid-type.
  const longest = React.useMemo(() => {
    const all = settleText ? [...phrases, settleText] : phrases;
    return all.reduce((a, b) => (b.length >= a.length ? b : a), "");
  }, [phrases, settleText]);

  const fallback = ssrText ?? settleText ?? longest;

  const [mounted, setMounted] = React.useState(false);
  const [text, setText] = React.useState(fallback);
  const [caretOn, setCaretOn] = React.useState(true);
  const [settled, setSettled] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Typing state machine. Cancels cleanly on unmount / prop change.
  React.useEffect(() => {
    if (!mounted || reduce) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const queue = settleText ? [...phrases, settleText] : phrases;
    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;

    // Start the cycle from an empty string so the first phrase types in.
    setText("");

    const step = () => {
      if (cancelled) return;
      const current = queue[phraseIdx];
      const isFinalSettle = settleText != null && phraseIdx === queue.length - 1;

      if (!deleting) {
        charIdx++;
        setText(current.slice(0, charIdx));
        if (charIdx >= current.length) {
          // Fully typed.
          if (isFinalSettle) {
            setSettled(true);
            return; // stop here — caret keeps blinking on the final promise
          }
          deleting = true;
          timer = setTimeout(step, holdTime);
          return;
        }
        timer = setTimeout(step, typeSpeed + Math.random() * 36);
      } else {
        charIdx--;
        setText(current.slice(0, Math.max(0, charIdx)));
        if (charIdx <= 0) {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % queue.length;
          timer = setTimeout(step, settleHoldDelay);
          return;
        }
        timer = setTimeout(step, deleteSpeed + Math.random() * 22);
      }
    };

    timer = setTimeout(step, 520); // small beat before typing begins
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, reduce]);

  // Blinking caret — pure JS interval so it works regardless of CSS purging.
  React.useEffect(() => {
    if (!mounted || reduce) return;
    const id = setInterval(() => setCaretOn((v) => !v), 530);
    return () => clearInterval(id);
  }, [mounted, reduce]);

  // Reduced motion: render the final promise, no caret, no animation.
  if (reduce) {
    return <Tag className={cn(className, textClassName)}>{fallback}</Tag>;
  }

  return (
    <Tag className={cn("relative inline-block", className)}>
      {/* Invisible width/height reserver so the gradient line never reflows. */}
      <span aria-hidden="true" className="invisible block whitespace-pre-wrap">
        {longest}
      </span>
      {/* Live typed text overlaid on the reserved box. textClassName carries any
          gradient/clip styling so it lands on the text-bearing element. */}
      <span className={cn("absolute inset-0 block", textClassName)} aria-live="polite">
        {mounted ? text : fallback}
        <span
          aria-hidden="true"
          className={cn(
            "ml-0.5 inline-block w-[2px] -translate-y-[2px] align-middle bg-current transition-opacity duration-100",
            "h-[0.9em]",
            settled ? "opacity-90" : "",
            caretOn ? "opacity-100" : "opacity-0",
            caretClassName
          )}
          style={{ verticalAlign: "-0.05em" }}
        />
      </span>
    </Tag>
  );
}
