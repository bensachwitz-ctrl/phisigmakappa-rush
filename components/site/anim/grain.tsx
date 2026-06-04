"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Grain — a faint, tactile SVG-noise layer (the `.gs-grain` utility) for
 * subtle film-grain depth behind the hero. Static (no motion), self-contained
 * (the noise is an inline data-URI in globals.css — no extra request), and
 * purely decorative: always rendered aria-hidden + pointer-events-none and
 * pinned behind content with -z-10.
 *
 * Keep it faint (~3–5% opacity, the utility default is 4%). It adds texture
 * without ever competing with the foreground, so there's nothing to gate on
 * reduced motion — it simply doesn't move.
 */
export function Grain({
  className,
  /** Override the very-low default opacity if a surface needs more/less tooth. */
  opacity,
}: {
  className?: string;
  opacity?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("gs-grain pointer-events-none absolute inset-0 -z-10", className)}
      style={opacity != null ? { opacity } : undefined}
    />
  );
}
