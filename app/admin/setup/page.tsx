import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { SetupWizard } from "@/components/admin/setup-wizard";
import { ArrowLeft } from "lucide-react";

import { IconSpark } from "@/components/brand/icons";
export const dynamic = "force-dynamic";

/**
 * /admin/setup — chapter onboarding wizard. Walks a brand-new chapter through
 * the 5 minimum-viable customization steps so the site re-brands end-to-end
 * before they hand the public URL to a single PNM.
 *
 * Steps:
 *   1. Chapter identity   (fraternity name, Greek letters, school)
 *   2. Brand colors       (school primary / dark / soft hexes)
 *   3. Contact            (rush email + advisor + chapter house)
 *   4. National policy    (anti-hazing hotline + URL)
 *   5. Launch             (review + go live)
 *
 * Each step's "Save & continue" PATCHes the values via /api/admin/settings —
 * same endpoint as the full settings page. Nothing here is wizard-only state.
 *
 * Admin-only: this is the chapter-config wizard (identity, brand, contact,
 * national policy). The middleware only checks for *a* session, not the role, so
 * without this gate any logged-in brother could open it by direct URL. Mirrors
 * the settings page + the /api/admin/settings PATCH (isAdminRole).
 */
export default async function SetupPage() {
  if (!isAdminAuthed()) redirect("/admin/login?from=%2Fadmin%2Fsetup");
  if (!isAdminRole()) redirect("/admin");

  const cfg = await getSiteConfig();
  return (
    <div className="container py-8 max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
        </Link>
        <Link
          href="/admin/settings"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Skip to advanced settings →
        </Link>
      </div>

      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
          <IconSpark className="h-3 w-3" aria-hidden="true" /> Chapter setup
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">
          Get your chapter live in 5 minutes.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Fill out these five steps once and the entire site re-brands to your chapter - page titles,
          social-share cards, footer attribution, Knowledge Panel record, email signatures, the works.
          You can come back and edit any of this later in <strong>Site content</strong>.
        </p>
      </div>

      <SetupWizard initial={cfg} />
    </div>
  );
}
