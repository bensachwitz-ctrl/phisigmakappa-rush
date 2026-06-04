"use client";

// clerk-google-button.tsx — the OPTIONAL "Continue with Google" control on the
// Brothers portal login page. It is the ONLY client module that touches Clerk's
// React hooks, and it is loaded by BrothersLoginPage via next/dynamic({ ssr:false })
// EXCLUSIVELY when isClerkConfiguredClient() is true. When Clerk is unset this
// component is never imported, so useSignIn() (which requires <ClerkProvider>)
// never runs and the login page renders the email/password form alone.
//
// What it does: starts a Clerk Google OAuth redirect. Clerk bounces the browser
// to Google and back to /portal/brothers/sso-callback, which finishes the Clerk
// handshake and then calls our own /api/portal/clerk-link to mint the EXISTING
// tenant-bound portal cookie. This component itself NEVER becomes the session —
// it only initiates identity verification.

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";

// Where Clerk returns the browser after the Google round-trip. This path hosts
// <AuthenticateWithRedirectCallback /> (see app/portal/brothers/sso-callback)
// which completes the Clerk session, then bridges to the portal session.
const SSO_CALLBACK_PATH = "/portal/brothers/sso-callback";

export default function ClerkGoogleButton() {
  const { isLoaded, signIn } = useSignIn();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    if (!isLoaded || !signIn) return;
    setError("");
    setStarting(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: SSO_CALLBACK_PATH,
        redirectUrlComplete: SSO_CALLBACK_PATH,
      });
      // On success the browser navigates away to Google; code below won't run.
    } catch {
      setError("Could not start Google sign-in. Please use email & password.");
      setStarting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Divider between the primary email/password form (above) and this
          optional social option — makes clear it is an alternative, not a
          replacement. */}
      <div className="relative flex items-center" aria-hidden="true">
        <span className="flex-grow border-t border-maroon-100" />
        <span className="mx-3 text-[11px] uppercase tracking-wide text-maroon-400">or</span>
        <span className="flex-grow border-t border-maroon-100" />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={!isLoaded || starting}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-maroon-200 bg-white text-maroon-900 text-sm font-semibold shadow-sm hover:bg-cream-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        <GoogleGlyph />
        {starting ? "Redirecting…" : "Continue with Google"}
      </button>

      <p className="text-[11px] text-maroon-500 leading-normal text-center px-2">
        Use the Google account on file with your chapter. We&apos;ll match it to your
        membership — your chapter dashboard still uses its own secure session.
      </p>
    </div>
  );
}

/** Inline Google "G" mark (no external asset, no extra request). */
function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 4.1 29.3 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.6 29.3 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.6 2.3-7.2 2.3-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C39.9 36.4 44 30.9 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
