"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobile-only sticky CTA that fades in after scrolling past the hero.
 * Drives conversions by keeping "Register" one tap away.
 */
export function StickyCTA() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      setShow(window.scrollY > 600 && window.scrollY < document.body.scrollHeight - window.innerHeight - 200);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        // Sit ABOVE the mobile bottom nav (which lives at bottom:0 z-40 with
        // ~64px content height + iOS safe-area inset). Without this offset
        // the StickyCTA covered the nav's right-side tabs ("Call",
        // "Brothers"), blocking taps. Use bottom-[calc(...)] to add the
        // safe-area inset on top of the nav height so notched phones don't
        // double-stack into the home indicator.
        "sm:hidden fixed inset-x-0 z-40 px-4 pb-4 pt-8",
        "bottom-[calc(env(safe-area-inset-bottom,0px)+64px)]",
        // Hide in print so a parent printing the consent receipt doesn't
        // get the floating CTA on the page.
        "print:hidden",
        "bg-gradient-to-t from-background via-background/95 to-transparent",
        "transition-transform duration-300",
        show ? "translate-y-0" : "translate-y-full pointer-events-none",
      )}
    >
      <Button asChild size="lg" className="w-full shadow-2xl shadow-phisig-red/30 group">
        <Link href="#register">
          <Sparkles className="h-4 w-4" />
          Register for rush
          <ArrowRight className="h-4 w-4 ml-auto transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Button>
    </div>
  );
}
