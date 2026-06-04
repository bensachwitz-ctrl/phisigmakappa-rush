"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps children and fades+slides them up the first time they enter the viewport.
 * Cheap, no library — just IntersectionObserver.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            obs.disconnect();
          }
        }
      },
      { rootMargin: "-40px 0px -10% 0px", threshold: 0.05 }
    );
    obs.observe(el);
    // Safety net: content must NEVER stay permanently invisible if the observer
    // doesn't fire (full-page render, atypical viewport, non-scrolling parent).
    // Scrolling users still trigger the reveal animation well before this.
    const fallback = window.setTimeout(() => setShown(true), 1500);
    return () => {
      obs.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <Tag
      ref={ref as any}
      className={cn(
        "transition-all duration-700",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className
      )}
      style={{
        transitionDelay: shown ? `${delay}ms` : "0ms",
        transitionTimingFunction: "cubic-bezier(.2,.8,.2,1)",
      }}
    >
      {children}
    </Tag>
  );
}

/**
 * Animates a number from 0 → {value} when the element scrolls into view.
 * SSR-safe: renders the final value during server render and on the very first
 * client paint so users never see "0+ Active brothers" / "0.00 Chapter GPA" in
 * the unanimated state. Animation only starts AFTER the IntersectionObserver
 * fires post-hydration.
 */
export function CountUp({
  value,
  suffix = "",
  prefix = "",
  duration = 1400,
  decimals = 0,
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  // `n === null` means "not animating yet — show the static final value".
  const [n, setN] = React.useState<number | null>(null);
  const started = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !started.current) {
            started.current = true;
            setN(0); // start the animation from zero
            const startTs = performance.now();
            const tick = (now: number) => {
              const t = Math.min(1, (now - startTs) / duration);
              const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
              const v = value * eased;
              setN(v);
              if (t < 1) requestAnimationFrame(tick);
              else setN(null); // settle back to static final value
            };
            requestAnimationFrame(tick);
          }
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration]);

  const current = n === null ? value : n;
  const display = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString();
  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
