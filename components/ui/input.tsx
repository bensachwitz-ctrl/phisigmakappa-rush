import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Brand-tracking focus/hover: the border warms toward the chapter
          // --primary on hover and adopts it on focus (alongside the existing
          // --ring halo), so a field "lights up" in the tenant color. The
          // transition keeps it from snapping. className still wins.
          "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background transition-[color,border-color,box-shadow] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
