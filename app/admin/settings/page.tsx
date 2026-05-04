import { getSiteConfig } from "@/lib/site-config";
import { SettingsManager } from "@/components/admin/settings-manager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSiteConfig();
  return (
    <main className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Site content</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit the homepage photos, copy, and stats. Saves apply immediately — no code deploy needed.
        </p>
      </div>
      <SettingsManager initial={settings} />
    </main>
  );
}
