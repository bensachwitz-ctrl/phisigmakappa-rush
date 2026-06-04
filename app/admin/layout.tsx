import type { Metadata } from "next";
import { headers } from "next/headers";
import { AdminShell } from "@/components/admin/admin-shell";
import { BillingBanner } from "@/components/admin/billing-banner";
import { getCurrentSession } from "@/lib/auth";
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

  // SOFT-GATE: resolve the chapter's platform-billing entitlement (fail-open —
  // never throws, never reports false on uncertainty) and surface a dismissible
  // banner to the chapter admin when the subscription needs attention (trial
  // ending / past due / inactive). This NEVER blocks the app — only the operator
  // `isActive` flag (app/page.tsx) hard-suspends a chapter. We only show it to
  // admins (the operator who can act on billing) and only when Stripe is wired.
  let banner: React.ReactNode = null;
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
  }

  return (
    <AdminShell isAdmin={isAdmin} banner={banner}>
      {children}
    </AdminShell>
  );
}
