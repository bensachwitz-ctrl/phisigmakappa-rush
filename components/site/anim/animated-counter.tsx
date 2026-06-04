"use client";

import * as React from "react";
import { useInView, useReducedMotion, animate } from "framer-motion";

/**
 * AnimatedCounter — counts from 0 → {value} when it scrolls into view, using
 * framer's `animate()` for a smooth eased ramp. A drop-in for stat tiles.
 *
 * SSR-safe: the final, formatted value is rendered server-side and on the first
 * client paint, so users never see a "0" flash and the layout never shifts.
 * The ramp only begins post-hydration once the element is in view.
 *
 * Reduced-motion-safe: skips the ramp entirely and shows the final value.
 *
 * (The codebase also ships <CountUp> in components/site/reveal.tsx; this is the
 * framer-native equivalent requested as an animation primitive and is used the
 * same way.)
 */
export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1.6,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const started = React.useRef(false);

  const format = React.useCallback(
    (n: number) =>
      decimals > 0
        ? n.toFixed(decimals)
        : Math.round(n).toLocaleString(),
    [decimals]
  );

  // Render final value initially (SSR + first paint).
  const [display, setDisplay] = React.useState(() => format(value));

  React.useEffect(() => {
    if (reduce || !inView || started.current) return;
    started.current = true;
    setDisplay(format(0));
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(format(v)),
    });
    return () => controls.stop();
  }, [inView, reduce, value, duration, format]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
