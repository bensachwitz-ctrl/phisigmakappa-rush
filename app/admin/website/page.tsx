import { getSiteConfig } from "@/lib/site-config";
import { WebsiteBuilderClient } from "./website-builder-client";
import { getCurrentSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSectionContentByKey } from "@/lib/section-builder";

export const dynamic = "force-dynamic";

export default async function WebsitePage() {
  const session = await getCurrentSession();
  if (!session || !session.isAdmin) {
    redirect("/admin/login");
  }
  
  const cfg = await getSiteConfig();
  
  // Merge structured SectionContent overrides into the config passed to the builder client
  const sectionOverrides = await getSectionContentByKey();
  if (sectionOverrides) {
    for (const [sectionKey, contentMap] of Object.entries(sectionOverrides)) {
      for (const [field, value] of Object.entries(contentMap)) {
        const fullKey = sectionKey === "hero" && field.startsWith("h1.") 
          ? `hero.${field}` 
          : `${sectionKey}.${field}`;
        cfg[fullKey] = value;
      }
    }
  }
  
  return (
    <main className="container max-w-5xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chapter Website Builder</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Customize the layout order and toggle the visibility of visual sections on your public landing page.
        </p>
      </div>
      <WebsiteBuilderClient initialConfig={cfg} />
    </main>
  );
}

