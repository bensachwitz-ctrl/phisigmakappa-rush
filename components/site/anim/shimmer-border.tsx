"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ShimmerBorder — wraps a child (e.g. a primary CTA <Button asChild> or the
 * final-CTA panel) in a slow, premium animated gradient ring (royal blue → sky
 * → cyan → gold) with a soft bloom that lifts on hover. The ring sits OUTSIDE
 * the content via a CSS mask, so it never clips the child.
 *
 * The motion lives entirely in `.gs-shimmer-border` (app/globals.css), which:
 *   • spins the conic gradient slowly (6s) and blooms on hover, and
 *   • collapses to a STATIC blue→sky→gold gradient ring under
 *     prefers-reduced-motion (no spin, no bloom).
 * So this component is purely structural — no JS animation, SSR-safe, and
 * inherently reduced-motion-safe. Match the child's corner radius so the ring
 * hugs it (default = rounded-full, ideal for pill buttons).
 *
 * Decorative ring only — it adds no semantics and forwards nothing to a11y;
 * the real, focusable element is the child.
 */
export function ShimmerBorder({
  children,
  className,
  /** Tailwind rounding for the ring; should match the child's radius. */
  rounded = "rounded-full",
  /** Render as an inline-flex (buttons) vs block (panels). */
  inline = true,
}: {
  children: React.ReactNode;
  className?: string;
  rounded?: string;
  inline?: boolean;
}) {
  return (
    <span
      className={cn(
        "gs-shimmer-border",
        inline ? "inline-flex" : "block",
        rounded,
        className
      )}
    >
      {children}
    </span>
  );
}
