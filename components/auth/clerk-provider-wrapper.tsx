// clerk-provider-wrapper.tsx — the ONLY module in the app that statically
// imports Clerk's <ClerkProvider>. It is loaded by app/layout.tsx via a dynamic
// `await import(...)` that runs EXCLUSIVELY inside the `isClerkConfigured()`
// branch. Because the import is dynamic and gated, when Clerk is unset this
// module is never imported, so `@clerk/nextjs` is never evaluated and no
// ClerkProvider is mounted — the layout renders children untouched.
//
// Keeping the static `@clerk/nextjs` import isolated in this leaf file (instead
// of in app/layout.tsx) is what preserves the #1 constraint: a top-level import
// in the root layout would pull Clerk's runtime into the layout's module graph
// for EVERY request, even with the keys absent. Here it is pulled only when the
// gate has already decided Clerk is on.

import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

/**
 * Thin pass-through around Clerk's provider. The caller (app/layout.tsx) has
 * already verified isClerkConfigured() before importing this, so by the time we
 * render, both Clerk keys are guaranteed present and the provider can read its
 * publishable key from the environment as usual.
 */
export default function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
