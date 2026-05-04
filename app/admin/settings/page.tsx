import Link from "next/link";
import { getSiteConfig } from "@/lib/site-config";
import { SettingsManager } from "@/components/admin/settings-manager";
import { ExternalLink, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSiteConfig();
  return (
    <main className="container py-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
            <Sparkles className="h-3 w-3" /> Self-serve content
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Site content</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            Change every photo, headline, stat, and visible section on the public homepage. Click <strong>Save</strong> at the top — changes go live in seconds. No code deploy, no Vercel, no waiting.
          </p>
        </div>
        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
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

      <SettingsManager initial={settings} />
    </main>
  );
}
