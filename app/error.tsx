"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
import { RefreshCcw, Home, Mail } from "lucide-react";

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
    <main className="min-h-screen bg-background flex flex-col">
      <div className="container py-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <Wordmark variant="compact" />
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-lg text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
            Something went sideways
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
            We hit a snag loading this page.
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            This isn't your fault. The chapter has been notified and we'll get it sorted. In the meantime, try one of these:
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={reset} size="lg" className="group">
              <RefreshCcw className="h-4 w-4 transition-transform group-hover:-rotate-90 duration-300" />
              Try again
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">
                <Home className="h-4 w-4" /> Go home
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <a href="mailto:rush@phisig-usc.com">
                <Mail className="h-4 w-4" /> Email rush chair
              </a>
            </Button>
          </div>
          {error.digest && (
            <p className="mt-8 text-[10px] text-muted-foreground font-mono">
              Reference: {error.digest}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
