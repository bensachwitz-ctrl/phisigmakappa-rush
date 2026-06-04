// clerk-config.ts — the single env gate that decides whether the OPTIONAL Clerk
// social-login enhancement is active.
//
// ───────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS / THE #1 CONSTRAINT
// ───────────────────────────────────────────────────────────────────────────
// Clerk is purely additive sugar layered on top of the app's own crown-jewel
// auth (lib/auth.ts admin, lib/portal-auth.ts portal, middleware.ts tenant
// routing). The existing email/password portal login stays the DEFAULT and the
// real source of truth. Clerk only ever brokers an *identity* — the moment a
// member is recognised, the app issues its OWN tenant-bound portal cookie via
// setPortalCookie(). Clerk never becomes the session.
//
// When BOTH env vars are unset (the default), `isClerkConfigured()` returns
// false and EVERY Clerk surface in the app must short-circuit BEFORE importing
// or executing any Clerk runtime:
//   • app/layout.tsx renders children with NO <ClerkProvider> in the tree.
//   • the portal login page renders ONLY the existing email/password form.
//   • app/api/portal/clerk-link/route.ts returns 404 without touching Clerk.
// The result is a byte-identical app to one where Clerk was never installed.
//
// IMPORTANT: this module must stay free of any `@clerk/*` import so it is safe
// to call from anywhere (server components, route handlers, client wrappers)
// without dragging Clerk's runtime into a bundle when Clerk is switched off.

/**
 * True only when BOTH Clerk keys are present in the environment. This is the
 * master switch for the entire optional integration.
 *
 *   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY — frontend SDK (mounts <ClerkProvider>,
 *     renders the social button). NEXT_PUBLIC_ so it is readable in the browser
 *     bundle; it is a publishable (non-secret) key by design.
 *   CLERK_SECRET_KEY — server-only; lets app/api/portal/clerk-link verify the
 *     Clerk session and read the user's verified email.
 *
 * Requiring BOTH avoids a half-configured state (e.g. provider mounts client
 * side but the server can never verify the session). Either one missing ⇒ the
 * whole feature stays dormant and the app behaves exactly as before.
 */
export function isClerkConfigured(): boolean {
  const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secret = process.env.CLERK_SECRET_KEY;
  return (
    typeof publishable === "string" &&
    publishable.trim().length > 0 &&
    typeof secret === "string" &&
    secret.trim().length > 0
  );
}

/**
 * Client-safe variant. A "use client" component cannot read CLERK_SECRET_KEY
 * (server-only env vars are not inlined into the browser bundle), so the
 * publishable key — which Next inlines wherever NEXT_PUBLIC_* is referenced —
 * is the only signal available at render time on the client.
 *
 * We accept "publishable key present" as the client-side proxy for "configured":
 * the server route (clerk-link) independently re-checks isClerkConfigured()
 * (both keys) before trusting anything, so a publishable-key-only misconfig can
 * never escalate — the worst case is a button that renders and then gets a
 * clean error from the server. The provider in app/layout.tsx is mounted off
 * the full isClerkConfigured() check, so this only ever returns true in a
 * window where ClerkProvider is actually present.
 */
export function isClerkConfiguredClient(): boolean {
  const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return typeof publishable === "string" && publishable.trim().length > 0;
}
