import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — a small status/label pill in the GreekStack design language.
 *
 * The `default` variant is intentionally UNSTYLED beyond the pill shape (no
 * background, inherits color) so the ~130 existing call-sites that supply their
 * own `bg-* / text-*` via className render byte-for-byte as before — className
 * always wins through tailwind-merge. The named color variants are the cohesive,
 * opt-in system: a soft two-tone tint (10% brand/semantic fill + a hairline ring
 * of the same hue) that reads premium and, for `primary`, tracks the per-chapter
 * `--primary` token so it re-brands per tenant with zero hardcoded color.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        // Back-compat: shape + type only; the call-site paints it.
        default: "",
        // Neutral chip — quiet metadata / counts.
        neutral: "bg-secondary text-secondary-foreground ring-1 ring-border",
        // Brand two-tone — tracks the chapter --primary.
        primary:
          "bg-[hsl(var(--primary)/0.10)] text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary)/0.22)]",
        success:
          "bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-300",
        warning:
          "bg-amber-500/14 text-amber-800 ring-1 ring-amber-500/30 dark:text-amber-300",
        danger:
          "bg-rose-500/12 text-rose-700 ring-1 ring-rose-500/25 dark:text-rose-300",
        info:
          "bg-sky-500/12 text-sky-700 ring-1 ring-sky-500/25 dark:text-sky-300",
        // Hollow — a hairline outline that inherits text color.
        outline: "border border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
