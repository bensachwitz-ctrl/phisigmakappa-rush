import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Greekstack brand symbol — a Greek temple/column on the platform gradient
 * (royal blue → sky) with a gold pediment accent. The pediment + capital +
 * three fluted columns (descending opacity = a "stack") fuse "Greek" + "stack".
 * Works as a logo, app icon, or favicon on any background.
 */
export function GreekstackLogo({ className, title = "Greekstack" }: { className?: string; title?: string }) {
  return (
    <svg
      className={className || "h-8 w-8"}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="gs-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2563EB" />
          <stop offset="0.55" stopColor="#1D4ED8" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#gs-grad)" />
      <rect x="0.6" y="0.6" width="38.8" height="38.8" rx="10.4" fill="none" stroke="rgba(255,255,255,0.18)" />
      <g fill="#ffffff">
        {/* pediment (temple roof) — gold accent */}
        <path d="M20 8 L29.5 14.2 L10.5 14.2 Z" fill="#FBBF24" opacity="0.98" />
        {/* capital / entablature */}
        <rect x="10.5" y="15.4" width="19" height="2.7" rx="1.2" opacity="0.96" />
        {/* three fluted columns — the "stack" */}
        <rect x="12.6" y="19" width="2.6" height="9.8" rx="1.3" opacity="0.95" />
        <rect x="18.7" y="19" width="2.6" height="9.8" rx="1.3" opacity="0.8" />
        <rect x="24.8" y="19" width="2.6" height="9.8" rx="1.3" opacity="0.65" />
        {/* stylobate / base */}
        <rect x="9.4" y="29.8" width="21.2" height="2.8" rx="1.2" opacity="0.96" />
      </g>
    </svg>
  );
}

/**
 * Greekstack wordmark lockup — the symbol + "Greekstack" with the "stack"
 * rendered in the platform gradient. For the apex marketing site + signup.
 */
export function GreekstackWordmark({
  className,
  symbolClassName,
  textClassName,
}: {
  className?: string;
  symbolClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <GreekstackLogo className={symbolClassName || "h-8 w-8"} />
      <span className={cn("font-bold tracking-tight leading-none", textClassName || "text-xl")}>
        <span className="text-foreground">Greek</span>
        <span className="gs-gradient-text">stack</span>
      </span>
    </span>
  );
}
