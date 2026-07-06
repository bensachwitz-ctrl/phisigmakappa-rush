import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { SettingsManager } from "@/components/admin/settings-manager";
import { ExternalLink } from "lucide-react";

import { IconSpark } from "@/components/brand/icons";
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // Admin-only: this page edits every chapter config knob (brand, e-board,
  // dues/Stripe keys). The middleware only checks for *a* session, not the role,
  // so without this gate any logged-in brother could open it by direct URL and
  // see/edit the full config. Matches the /api/admin/settings GET (isAdminRole).
  if (!isAdminAuthed()) redirect("/admin/login?from=%2Fadmin%2Fsettings");
  if (!isAdminRole()) redirect("/admin");

  const settings = await getSiteConfig();
  // Platform-level credential presence (BOOLEANS ONLY — never the values). Lets
  // the settings UI show an honest "Connected" badge per integration: a chapter
  // that leaves the per-chapter fields blank still sends via the platform
  // default when that env credential is configured. Mirrors /api/health's
  // boolean integration map; no secret ever crosses to the client.
  const envIntegrations = {
    resend: !!process.env.RESEND_API_KEY,
    twilio: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN && !!process.env.TWILIO_PHONE_NUMBER,
    stripe: !!process.env.STRIPE_SECRET_KEY,
    googleCal: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
  };
  return (
    <div className="container py-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
            <IconSpark className="h-3 w-3" /> Self-serve content
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Site content</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            Change every photo, headline, stat, and visible section on the public homepage. Click <strong>Save</strong> at the top - changes go live in seconds. No code deploy, no Vercel, no waiting.
          </p>
        </div>
        <Link
          href="/"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary hover:border-phisig-red/40 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5 text-phisig-red" /> View live site
        </Link>
      </div>

      <div className="mb-6 rounded-xl border border-phisig-red/20 bg-phisig-red-soft/30 p-4 text-sm leading-relaxed">
        <p className="font-semibold text-foreground mb-1">How to change a photo</p>
        <ol className="text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Find the photo you want to change in the panels below.</li>
          <li>Click <strong>Upload photo</strong> and pick a JPG or PNG from your phone or laptop.</li>
          <li>Click <strong>Save</strong> at the top of the page. The homepage updates instantly.</li>
        </ol>
      </div>

      <SettingsManager initial={settings} envIntegrations={envIntegrations} />
    </div>
  );
}
