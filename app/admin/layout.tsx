import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentSession } from "@/lib/auth";

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
  return <AdminShell isAdmin={!!session?.isAdmin}>{children}</AdminShell>;
}
