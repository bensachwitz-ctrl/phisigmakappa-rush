"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Scoped error boundary for the onboarding funnel. A render-time crash anywhere
 * in the wizard (or the live-preview) recovers in-flow here — with a Retry that
 * re-renders the segment and a "Talk to Ben" escape — instead of dropping the
 * founder onto the generic site-wide error page mid-signup. Matches the wizard's
 * dark glass aesthetic so the recovery still feels like part of the funnel.
 */
export default function OnboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Onboard error boundary caught:", error);
  }, [error]);

  return (
    <div className="relative mx-auto max-w-lg">
      <div className="animate-soft-enter rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl shadow-blue-950/40 ring-1 ring-white/5 backdrop-blur-md">
        <div className="relative mx-auto mb-5 w-fit">
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 rounded-2xl bg-amber-400/25 blur-2xl"
          />
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-300/5 text-amber-300 ring-1 ring-amber-400/25">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
          Setup hiccup
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Let&apos;s try that again.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-300">
          Something glitched while setting up your chapter — your progress wasn&apos;t lost.
          Retry below, or grab a hand from Ben and he&apos;ll launch it with you.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button
            onClick={reset}
            size="lg"
            className="group bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-950/30 press"
          >
            Try again
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="press border-white/15 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white"
          >
            <Link href="/contact#book">Talk to our team</Link>
          </Button>
        </div>
        {error.digest && (
          <p className="mt-7 font-mono text-[10px] text-slate-500">Reference: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
