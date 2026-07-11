"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconRefresh as RefreshCw, IconXCircle as XCircle } from "@/components/brand/icons";

// Segment-scoped error boundary for the alumni invite-redemption flow.
//
// WHY: this is the ONLY way an alum enters the alumni portal (a single-use
// invite link). Before, this segment had no error.tsx, so any runtime error
// here bubbled to the root app/error.tsx — a generic "something went sideways"
// page with no path back into onboarding. This boundary keeps the failure
// LOCAL and gives the alum the two recovery actions that actually help:
// retry, or jump to sign-in / request-access. It mirrors the page's own
// "invalid invite" copy so the experience stays cohesive.
export default function AlumniOnboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[alumni onboard] segment error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-cream-50 text-maroon-950 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-maroon-100 p-8 shadow-sm text-center max-w-md w-full">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-red-50 text-red-600 mb-4">
          <XCircle className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-maroon-900 mb-2">We couldn&apos;t load your invite</h1>
        <p className="text-sm text-maroon-600 mb-6 max-w-sm mx-auto">
          Something went wrong on our end while opening your onboarding link. Your invite is still
          valid — please try again, or sign in if you already created your account.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-maroon-700 hover:bg-maroon-800 text-cream-50 w-full sm:w-auto inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Try again
          </Button>
          <Link href="/portal/alumni">
            <Button className="bg-cream-100 hover:bg-cream-200 text-maroon-900 border border-maroon-200 w-full sm:w-auto">
              Sign in
            </Button>
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 text-[10px] text-maroon-400 font-mono">Reference: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
