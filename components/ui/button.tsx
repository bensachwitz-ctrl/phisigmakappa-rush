"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-phisig-red-dark active:scale-[0.98]",
        // Every pressable variant gets tactile press feedback (active:scale ~0.98
        // — Emil Kowalski's scale-on-press) so taps "give" under the finger; the
        // micro-lift on outline hover matches the filled variants' language.
        outline:
          "border border-border bg-background hover:border-blue-500/40 hover:bg-secondary hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
        ghost: "hover:bg-secondary active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
        gradient:
          "bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shadow-lg shadow-phisig-red/25 hover:shadow-xl hover:shadow-phisig-red/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        // CUSTOM premium platform button — royal-blue → sky vertical gradient
        // with a bright white top-edge highlight (::before glaze on the top
        // half), a hairline gold bottom edge + inset white ring carried in the
        // box-shadow stack, a soft blue glow that deepens on hover, and a
        // confident active press. The glaze + inset ring + gold edge are what
        // make it read bespoke, not stock. The decorative top glaze uses
        // ::before only, leaving ::after free for the `gs-sheen` moving-highlight
        // class that call-sites add (so the two never collide). Zero purple.
        platform:
          "relative isolate overflow-hidden bg-gradient-to-b from-[#3b82f6] via-[#2563eb] to-[#0ea5e9] text-white " +
          "shadow-[0_8px_24px_-6px_rgba(37,99,235,0.55),inset_0_1px_0_0_rgba(255,255,255,0.45),inset_0_-1px_0_0_rgba(251,191,36,0.55)] " +
          "before:pointer-events-none before:absolute before:inset-x-px before:top-0 before:h-1/2 before:rounded-[inherit] before:bg-gradient-to-b before:from-white/30 before:to-transparent before:content-['']" +
          " transition-all hover:from-[#2563eb] hover:via-[#1d4ed8] hover:to-[#0284c7] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-6px_rgba(37,99,235,0.7),inset_0_1px_0_0_rgba(255,255,255,0.55),inset_0_-1px_0_0_rgba(251,191,36,0.7)] " +
          "active:translate-y-0 active:scale-[0.97] active:shadow-[0_6px_16px_-6px_rgba(37,99,235,0.6),inset_0_1px_0_0_rgba(255,255,255,0.4)] " +
          "focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2",
        glass:
          "border border-white/15 bg-white/10 text-foreground backdrop-blur-md shadow-sm hover:bg-white/20 hover:border-white/25 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-6 text-base",
        // 44px square — the Apple HIG minimum touch target (was 40px). Icon-only
        // buttons have no text padding to grow the hit area, so the variant must
        // carry the minimum itself. A call-site can still shrink the visible glyph
        // while keeping the 44px target by padding rather than overriding h/w.
        icon: "h-11 w-11",
        xl: "h-14 rounded-xl px-8 text-base font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
