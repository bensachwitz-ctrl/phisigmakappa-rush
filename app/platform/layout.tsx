import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSuperAdmin } from "@/lib/superadmin";

export const dynamic = "force-dynamic";

// The platform console is operator-only and must never be indexed.
export const metadata: Metadata = {
  title: "Greekstack — Platform Console",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Best-effort current request path, used ONLY to avoid redirect-looping the
 * login page (which is itself a child of this layout).
 *
 * On Vercel's serverless runtime (the production target) Next runs in
 * "minimalMode" and the matched route arrives as the `x-matched-path` REQUEST
 * header — reliable there. The dev server doesn't set it; the other keys are
 * best-effort fallbacks. When the path is genuinely unknown we return "" and the
 * gate treats it as the console route (gates normally) — safe, because an
 * unauthenticated console request 401s at the API and the client page bounces to
 * login regardless.
 */
function currentPath(): string {
  try {
    const h = headers();
    return (
      h.get("x-matched-path") ||
      h.get("x-invoke-path") ||
      h.get("x-pathname") ||
      ""
    );
  } catch {
    return "";
  }
}

/**
 * Server-side gate for the /platform tree.
 *
 * Security: redirects any request WITHOUT a valid `gs_superadmin` cookie to the
 * login page. A chapter admin's `greekstack_admin` cookie does NOT satisfy
 * isSuperAdmin() (separate cookie + separate secret), so a chapter e-board can
 * never reach the console here. This is defense-in-depth on top of the API
 * routes, which each independently re-check isSuperAdmin().
 *
 * Loop-safety: the login page (/platform/login) lives under this layout, so we
 * must not bounce it back to itself. When we can read the path and it's the
 * login route, we render children without gating. The console page itself is a
 * client component that ALSO redirects to /platform/login on a 401 from the API,
 * so even if the path can't be read here, an unauthenticated visitor never sees
 * console data.
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const path = currentPath();
  // Redirect ONLY when we positively know this is a non-login /platform route.
  // If the path is unknown (dev server, where x-matched-path isn't set) we fall
  // through and render children — the console page is a client component that
  // redirects to /platform/login on a 401 from the API, so no console data is
  // ever exposed, and the login page never loops back onto itself.
  const knownNonLoginRoute =
    path.startsWith("/platform") && !path.startsWith("/platform/login");
  if (knownNonLoginRoute && !isSuperAdmin()) {
    redirect("/platform/login");
  }
  return <>{children}</>;
}
