import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "aurora" | "grid" | "aurora-grid" | "spotlight";
type Tone = "platform" | "brand";

/**
 * Premium animated hero background — soft drifting aurora blobs and/or a faded
 * grid, masked to fade at the edges. All motion is transform/opacity only and
 * is auto-disabled under prefers-reduced-motion (see globals.css). Decorative,
 * so the layer is aria-hidden + pointer-events-none.
 *
 * tone="platform" → Greekstack royal blue / sky / gold (apex marketing + signup).
 * tone="brand"    → the current chapter's primary color (per-tenant heroes).
 */
export function AnimatedBackground({
  variant = "aurora",
  tone = "platform",
  className,
  children,
}: {
  variant?: Variant;
  tone?: Tone;
  className?: string;
  children?: React.ReactNode;
}) {
  const blobs =
    tone === "brand"
      ? [
          "bg-[hsl(var(--primary)/0.45)]",
          "bg-[hsl(var(--primary)/0.28)]",
          "bg-[hsl(var(--primary)/0.20)]",
        ]
      : ["bg-[#2563eb]/40", "bg-[#38bdf8]/30", "bg-[#f59e0b]/25"];

  const showAurora = variant === "aurora" || variant === "aurora-grid";
  const showGrid = variant === "grid" || variant === "aurora-grid";

  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {showAurora && (
          <>
            <div className={cn("absolute -top-1/4 left-[15%] h-[55vh] w-[55vh] rounded-full blur-[100px] animate-aurora-a", blobs[0])} />
            <div className={cn("absolute top-1/4 right-[12%] h-[50vh] w-[50vh] rounded-full blur-[100px] animate-aurora-b", blobs[1])} />
            <div className={cn("absolute -bottom-1/4 left-[35%] h-[48vh] w-[48vh] rounded-full blur-[100px] animate-aurora-c", blobs[2])} />
          </>
        )}
        {showGrid && (
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,120,140,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,120,140,0.10)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_72%)]" />
        )}
        {variant === "spotlight" && (
          <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(37,99,235,0.18),transparent_70%)]" />
        )}
      </div>
      {children}
    </div>
  );
}
