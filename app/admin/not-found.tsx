import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { IconCompass as Compass, IconDashboard as LayoutDashboard, IconLifebuoy as LifeBuoy } from "@/components/brand/icons";

export const metadata: Metadata = {
  title: "Section not found",
  // Inherit the admin layout's no-index posture — a 404 under /admin must never
  // be crawled or unfurled.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * 404 *within* the admin chrome. Rendering this inside app/admin keeps a
 * logged-in officer on a bad /admin/* URL inside the admin shell (nav + brand)
 * instead of dropping them onto the PUBLIC marketing 404 (app/not-found.tsx),
 * which would look like they'd been signed out. Links back to the dashboard
 * and Help rather than the public homepage.
 */
export default function AdminNotFound() {
  return (
    <div className="container flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg text-center animate-slide-up">
        <div className="relative mx-auto mb-6 w-fit">
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 rounded-2xl bg-[hsl(var(--primary)/0.18)] blur-2xl"
          />
          <IconChip icon={Compass} tone="brand" size="lg" />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-phisig-red/20 bg-phisig-red-soft/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-phisig-red">
          404 · Admin
        </span>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight [text-wrap:balance] sm:text-4xl">
          That admin section doesn&apos;t exist.
        </h1>

        <p className="mx-auto mt-3 max-w-sm leading-relaxed text-muted-foreground">
          The page may have moved or the link is stale. Head back to your dashboard
          and pick a section from the nav.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="group cta-shine press">
            <Link href="/admin">
              <LayoutDashboard className="h-4 w-4" /> Back to dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="press">
            <Link href="/admin/help">
              <LifeBuoy className="h-4 w-4" /> Get help
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
