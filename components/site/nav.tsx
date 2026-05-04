"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";

export function PublicNav() {
  const params = useSearchParams();
  const booth = params.get("booth") === "1";

  // Booth mode: hide all nav links so rushees can't wander off the page.
  // Show a discreet "Booth mode" badge instead so the volunteer can confirm it's active.
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
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="#schedule"
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
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="#register">Register</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/login" className="text-muted-foreground">
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              Brothers
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
