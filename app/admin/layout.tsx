import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { BillingBanner } from "@/components/admin/billing-banner";
import { getCurrentSession } from "@/lib/auth";
import { getOfficerPermissionsForBrother } from "@/lib/permissions";
import { getSubdomain } from "@/lib/prisma";
import { getEntitlement } from "@/lib/entitlement";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// Defense-in-depth: robots.txt already disallows /admin and /api/admin, but we
// also emit X-Robots-Tag-equivalent meta on every admin route so non-compliant
// crawlers (which ignore robots.txt) and inline previews (Slack/Twitter unfurls)
// also skip indexing. Belt and suspenders.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  const isAdmin = !!session?.isAdmin;

  // DEFENSE-IN-DEPTH page-level auth gate. Middleware already redirects an
  // unauthenticated /admin/* request to /admin/login, but middleware must NOT be
  // the only gate: a middleware bypass (e.g. CVE-2025-29927, patched by the Next
  // 14.2.35 bump, but belt-and-suspenders for any future regression) would
  // otherwise render this layout — and its admin Server Components — to an
  // unauthenticated caller. So we re-verify the session here and redirect when it
  // is missing. We resolve the current path from the middleware-injected
  // x-pathname header and NEVER redirect the /admin/login page itself (that would
  // loop). getCurrentSession() returns null for any tampered/expired cookie, so
  // a forged value can't satisfy this gate (the HMAC is verified in lib/auth).
  let currentPath = "";
  try {
    currentPath = headers().get("x-pathname") || "";
  } catch {
    currentPath = "";
  }
  const onLoginPage = currentPath.startsWith("/admin/login");
  if (!session && !onLoginPage) {
    redirect("/admin/login");
  }

  // DEFENSE-IN-DEPTH RBAC — member-vs-exec separation at the admin boundary.
  //
  // The middleware + the session gate above only prove the cookie is a VALID
  // session for this tenant — NOT that it belongs to an officer/admin. But the
  // member-login branch (POST /api/admin/login, mode:"brother") mints the SAME
  // `phisig_admin` cookie with isAdmin=false for any plain brother. So without
  // this check, a regular member who signed into the member app would carry a
  // cookie that satisfies both the middleware and the session gate and could
  // reach EVERY /admin/* surface — including the ones that don't yet call
  // requireOfficerPermission (the landing dashboard, audit log, officers,
  // settings, etc.). That is a real member→exec leak, not just a UI slip.
  //
  // Fix: admit a request to the admin area only when the session is EITHER a
  // chapter super-admin (isAdmin=true) OR an officer who holds at least one
  // active OfficerAssignment (some non-empty permission domain). A plain member
  // (zero assignments, isAdmin=false) is bounced to their own portal home — NOT
  // back to /admin/login (that would loop, since their cookie is valid) and NOT
  // 403'd inside the shell (a member never belongs here at all). Per-page
  // requireOfficerPermission() gates still enforce the FINER domain split on top
  // of this; this is the coarse "are you allowed in the building" gate.
  if (session && !onLoginPage && !isAdmin) {
    const perms = await getOfficerPermissionsForBrother(session.brother.id);
    const isOfficer = perms.superAdmin || Object.keys(perms.domain || {}).length > 0;
    if (!isOfficer) {
      redirect("/portal");
    }
  }

  // SOFT-GATE: resolve the chapter's platform-billing entitlement (fail-open —
  // never throws, never reports false on uncertainty) and surface a dismissible
  // banner to the chapter admin when the subscription needs attention (trial
  // ending / past due / inactive). This NEVER blocks the app — only the operator
  // `isActive` flag (app/page.tsx) hard-suspends a chapter. We only show it to
  // admins (the operator who can act on billing) and only when Stripe is wired.
  let banner: React.ReactNode = null;
  let cookieScript: React.ReactNode = null;

  if (isAdmin) {
    let subdomain = "";
    try {
      subdomain = getSubdomain(headers().get("host")) || "";
    } catch {
      subdomain = "";
    }
    const entitlement = await getEntitlement(subdomain);
    const stripeConfigured = !!getStripe();
    banner = (
      <BillingBanner
        reason={entitlement.reason}
        status={entitlement.status}
        daysLeft={entitlement.daysLeft}
        stripeConfigured={stripeConfigured}
      />
    );

    const isLockedOut =
      entitlement.status === "canceled" ||
      entitlement.status === "unpaid" ||
      entitlement.reason === "canceled" ||
      entitlement.reason === "trial_expired";

    if (isLockedOut) {
      cookieScript = (
        <script
          dangerouslySetInnerHTML={{
            __html: `document.cookie = "phisig_billing_locked=1; path=/; max-age=43200; SameSite=Lax"`,
          }}
        />
      );

      const pathname = headers().get("x-pathname") || "";
      if (pathname && !pathname.startsWith("/admin/billing")) {
        redirect("/admin/billing");
      }
    } else {
      cookieScript = (
        <script
          dangerouslySetInnerHTML={{
            __html: `document.cookie = "phisig_billing_locked=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"`,
          }}
        />
      );
    }
  }

  return (
    <>
      {cookieScript}
      <AdminShell isAdmin={isAdmin} banner={banner}>
        {children}
      </AdminShell>
    </>
  );
}
