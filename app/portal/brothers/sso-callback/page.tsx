// app/portal/brothers/sso-callback/page.tsx — landing route for the OPTIONAL
// Clerk Google OAuth round-trip on the Brothers portal. Gated on
// isClerkConfigured(): when Clerk is unset this route 404s (notFound) and the
// client callback component — the only thing that imports Clerk hooks — is
// never rendered, so the unconfigured build stays free of Clerk execution here.
//
// When Clerk is on, it renders <ClerkSsoCallback /> which finishes the Clerk
// handshake and then bridges to the EXISTING tenant-bound portal session via
// /api/portal/clerk-link. This page is reachable only as the redirect target of
// the "Continue with Google" button; it never replaces the email/password flow.

import { notFound } from "next/navigation";
import { isClerkConfigured } from "@/lib/clerk-config";
import ClerkSsoCallback from "@/components/auth/clerk-sso-callback";

export const dynamic = "force-dynamic";

export default function BrothersSsoCallbackPage() {
  if (!isClerkConfigured()) notFound();
  return <ClerkSsoCallback />;
}
