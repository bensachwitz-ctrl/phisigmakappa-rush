"use client";

// clerk-sso-callback.tsx — completes the Clerk Google OAuth round-trip and
// bridges the resulting Clerk identity to the app's EXISTING tenant-bound
// portal session. Rendered only by app/portal/brothers/sso-callback (which is
// itself gated on isClerkConfigured()), so Clerk hooks here run only when the
// feature is on.
//
// Two phases:
//   1. <AuthenticateWithRedirectCallback /> finalises the Clerk handshake when
//      the browser lands here straight from Google (transferable OAuth state).
//   2. Once useUser() reports a signed-in Clerk session, POST /api/portal/clerk-link.
//      That server route verifies the Clerk session, reads the verified email,
//      finds the matching member IN THE CURRENT TENANT, and issues the portal
//      cookie via setPortalCookie. On ok → go to the dashboard; on failure →
//      show the reason and a path back to the email/password login.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthenticateWithRedirectCallback, useUser } from "@clerk/nextjs";

const DASHBOARD = "/portal/brothers/dashboard";
const LOGIN = "/portal/brothers";

export default function ClerkSsoCallback() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [error, setError] = useState("");
  // Guard so the link POST fires exactly once even though useUser() may settle
  // across several renders.
  const linkedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || linkedRef.current) return;
    linkedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/portal/clerk-link", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok) {
          router.push(DASHBOARD);
          router.refresh();
        } else {
          setError(
            data?.error ||
              "We couldn't match your Google account to a member in this chapter.",
          );
        }
      } catch {
        setError("A connection error occurred. Please try the email & password sign-in.");
      }
    })();
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="min-h-screen bg-cream-50 text-maroon-950 flex items-center justify-center px-4">
      {/* Mounts the Clerk callback handler. It transfers the OAuth result into a
          Clerk session, then (per redirectUrlComplete) keeps us on this page so
          the effect above can bridge to the portal session. */}
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl={LOGIN}
        signUpForceRedirectUrl={LOGIN}
      />

      <div className="max-w-sm w-full text-center bg-white rounded-2xl border border-maroon-100 p-6 sm:p-8 shadow-sm space-y-3">
        {error ? (
          <>
            <h1 className="text-lg font-bold text-maroon-900">Couldn&apos;t sign you in</h1>
            <p className="text-sm text-maroon-700">{error}</p>
            <Link
              href={LOGIN}
              className="inline-flex items-center justify-center mt-2 px-4 py-2 rounded-xl bg-maroon-800 hover:bg-maroon-900 text-cream-50 text-sm font-semibold transition"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <div
              className="mx-auto w-8 h-8 rounded-full border-2 border-maroon-200 border-t-maroon-700 animate-spin"
              aria-hidden="true"
            />
            <h1 className="text-lg font-bold text-maroon-900">Signing you in…</h1>
            <p className="text-sm text-maroon-600">
              Matching your Google account to your chapter membership.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
