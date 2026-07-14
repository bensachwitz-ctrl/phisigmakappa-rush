import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { parseRushFormConfig, CORE_RUSH_FIELDS } from "@/lib/rush-form-config";
import { RushFormBuilderClient } from "./forms-client";

export const dynamic = "force-dynamic";

/**
 * /admin/forms — per-tenant rush/intake form customizer.
 *
 * RBAC: chapter super-admins only (same gate as /admin/website). The write path
 * is the existing PATCH /api/admin/settings, which independently enforces
 * isAdminRole() + billing guard + audit logging, so this page adds no new
 * privileged API surface. The field config is stored per-tenant in SiteConfig
 * under `rush.customQuestions`, so it is structurally scoped to this chapter.
 */
export default async function AdminFormsPage() {
  const session = await getCurrentSession();
  if (!session || !session.isAdmin) {
    redirect("/admin/login");
  }

  const cfg = await getSiteConfig();
  const fields = parseRushFormConfig(cfg["rush.customQuestions"]);

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rush Form Builder</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Add custom questions to your public rush / intake form. These appear on
          the &ldquo;Your details&rdquo; step, on top of the built-in fields below.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Always-on built-in fields
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CORE_RUSH_FIELDS.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground"
            >
              {f.label}
              {f.required && <span className="text-brand-red" aria-hidden="true">*</span>}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          These ship with every rush form and can&rsquo;t be removed. Your custom
          questions are collected in addition to them.
        </p>
      </div>

      <RushFormBuilderClient initialFields={fields} />
    </div>
  );
}
