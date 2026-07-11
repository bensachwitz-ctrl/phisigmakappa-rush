"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { IconChip } from "@/components/ui/icon-chip";
import { IconRefresh as RefreshCcw, IconHome as Home, IconAlert as TriangleAlert } from "@/components/brand/icons";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Surface to console for debugging; in production this would go to Sentry/Logtail.
    // eslint-disable-next-line no-console
    console.error("Page-level error boundary caught:", error);
  }, [error]);

  return (
    <AnimatedBackground variant="aurora-grid" tone="brand" className="min-h-screen bg-background">
      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="container py-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <Wordmark variant="compact" />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12">
          <div className="w-full max-w-lg text-center animate-slide-up">
            {/* Decorative chip — soft amber-tinted warning glyph */}
            <div className="relative mx-auto mb-6 w-fit">
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-2xl bg-amber-400/25 blur-2xl"
              />
              <IconChip icon={TriangleAlert} tone="muted" size="lg" className="text-amber-600 ring-amber-500/25 bg-gradient-to-br from-amber-400/15 to-amber-300/5" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Something went sideways
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight [text-wrap:balance]">
              We hit a snag loading this page.
            </h1>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground leading-relaxed">
              This isn&apos;t your fault. The chapter has been notified and we&apos;ll get it
              sorted. In the meantime, try one of these:
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button onClick={reset} size="lg" className="group cta-shine press">
                <RefreshCcw className="h-4 w-4 transition-transform group-hover:-rotate-90 duration-300" />
                Try again
              </Button>
              <Button asChild variant="outline" size="lg" className="press bg-white/70 backdrop-blur">
                <Link href="/">
                  <Home className="h-4 w-4" /> Go home
                </Link>
              </Button>
            </div>
            {error.digest && (
              <p className="mt-8 text-[10px] text-muted-foreground font-mono">
                Reference: {error.digest}
              </p>
            )}
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
