"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { RefreshCcw, LayoutDashboard, TriangleAlert } from "lucide-react";

/**
 * Error boundary *within* the admin chrome. Rendering this inside app/admin keeps
 * a logged-in officer who hits a thrown query/render error inside the admin shell
 * (nav + brand) — the same reason app/admin/not-found.tsx exists — instead of
 * dropping them onto the site-wide error page, which would look like a sign-out.
 * Offers an in-place Retry (re-runs the failed segment) plus a Dashboard escape.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Admin error boundary caught:", error);
  }, [error]);

  return (
    <div className="container flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg text-center animate-slide-up">
        <div className="relative mx-auto mb-6 w-fit">
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 rounded-2xl bg-amber-400/25 blur-2xl"
          />
          <IconChip
            icon={TriangleAlert}
            tone="muted"
            size="lg"
            className="bg-gradient-to-br from-amber-400/15 to-amber-300/5 text-amber-600 ring-amber-500/25"
          />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          Admin · Error
        </span>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight [text-wrap:balance] sm:text-4xl">
          Something went off the rails.
        </h1>

        <p className="mx-auto mt-3 max-w-sm leading-relaxed text-muted-foreground">
          This section hit a snag loading. Your data is safe - try again, or head
          back to your dashboard and pick another section.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset} size="lg" className="group cta-shine press">
            <RefreshCcw className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-90" />
            Try again
          </Button>
          <Button asChild variant="outline" size="lg" className="press">
            <Link href="/admin">
              <LayoutDashboard className="h-4 w-4" /> Back to dashboard
            </Link>
          </Button>
        </div>

        {error.digest && (
          <p className="mt-8 font-mono text-[10px] text-muted-foreground">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
