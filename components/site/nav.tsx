"use client";

import * as React from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";

export function PublicNav({ booth: boothProp }: { booth?: boolean } = {}) {
  // Read ?booth=1 from window after hydration so we never throw during SSR.
  // If a parent server component already detected booth and passed it down, use
  // that as the SSR-correct initial state (avoids a nav-link flash on first paint).
  const [booth, setBooth] = React.useState(!!boothProp);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setBooth(new URLSearchParams(window.location.search).get("booth") === "1");
  }, []);

  if (booth) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-16 items-center justify-between">
          <span className="hover:opacity-90 transition-opacity">
            <Wordmark variant="compact" />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-phisig-red/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
            <Sparkles className="h-3 w-3" /> Booth mode
          </span>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <Wordmark variant="compact" />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/schedule"
            className="hidden sm:inline-flex h-9 items-center px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Schedule
          </Link>
          <Link
            href="#about"
            className="hidden sm:inline-flex h-9 items-center px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            About
          </Link>
          <Link
            href="/alumni"
            className="hidden sm:inline-flex h-9 items-center px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Alumni
          </Link>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="#register">Register</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/portal" className="text-muted-foreground">
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              Portal
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
