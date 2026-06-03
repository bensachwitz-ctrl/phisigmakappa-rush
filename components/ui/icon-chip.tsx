import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * A premium icon "chip" — a soft gradient rounded square holding a lucide icon.
 * Used in feature lists, stat tiles, nav, and empty states for a consistent,
 * elevated look. tone="brand" tints to the current chapter's primary color.
 */
export function IconChip({
  icon: Icon,
  tone = "brand",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: "brand" | "platform" | "muted";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box = {
    sm: "h-8 w-8 rounded-lg",
    md: "h-11 w-11 rounded-xl",
    lg: "h-14 w-14 rounded-2xl",
  }[size];
  const ic = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" }[size];
  const toneCls = {
    brand:
      "bg-gradient-to-br from-[hsl(var(--primary)/0.18)] to-[hsl(var(--primary)/0.05)] text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary)/0.20)]",
    platform:
      "bg-gradient-to-br from-indigo-500/15 to-cyan-400/10 text-indigo-500 ring-1 ring-indigo-500/20",
    muted: "bg-secondary text-muted-foreground ring-1 ring-border",
  }[tone];

  return (
    <span className={cn("inline-flex items-center justify-center shadow-sm", box, toneCls, className)}>
      <Icon className={ic} aria-hidden="true" />
    </span>
  );
}
