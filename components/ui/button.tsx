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
        outline:
          "border border-border bg-background hover:bg-secondary",
        ghost: "hover:bg-secondary",
        link: "text-primary underline-offset-4 hover:underline",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        gradient:
          "bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shadow-lg shadow-phisig-red/25 hover:shadow-xl hover:shadow-phisig-red/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        platform:
          "bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        glass:
          "border border-white/15 bg-white/10 text-foreground backdrop-blur-md shadow-sm hover:bg-white/20 hover:border-white/25 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-6 text-base",
        icon: "h-10 w-10",
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
