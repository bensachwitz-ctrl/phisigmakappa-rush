import { redirect, notFound } from "next/navigation";
import { isSuperAdmin } from "@/lib/superadmin";
import { resolveTenantForOwner, loadChapterOfficerView } from "@/lib/owner-console";
import ChapterOfficerConsole from "./officer-console";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Owner console — per-chapter officer management.
 *
 * Server gate: the /platform layout already redirects non-operators, but we
 * re-check isSuperAdmin() here too (defense in depth) and bounce to the login
 * before any chapter data is touched. The officer view is then loaded from the
 * CHOSEN chapter's OWN schema via resolveTenantForOwner + getTenantClient —
 * never from the request Host (the owner is on the apex / platform Host). The
 * resolved data is handed to a client island that owns the switch interactions;
 * that island re-fetches over the operator-gated API, which re-checks the cookie
 * on every call.
 */
export default async function OwnerChapterConsolePage({
  params,
}: {
  params: { id: string };
}) {
  if (!isSuperAdmin()) {
    redirect("/platform/login");
  }

  const gate = await resolveTenantForOwner(params.id);
  if (!gate.ok) {
    if (gate.status === 401) redirect("/platform/login");
    // 404 / 400 → no such chapter
    notFound();
  }

  const view = await loadChapterOfficerView(gate.value.db, gate.value.tenant);

  return (
    <ChapterOfficerConsole
      tenantId={gate.value.tenant.id}
      subdomain={gate.value.tenant.subdomain}
      chapterName={gate.value.tenant.name}
      initial={{
        positions: view.positions.map((p) => ({
          ...p,
          holder: p.holder
            ? { ...p.holder, startDate: p.holder.startDate.toISOString() }
            : null,
        })),
        roster: view.roster,
        currentTerm: view.currentTerm,
        account: {
          ...view.account,
          trialEndsAt: view.account.trialEndsAt
            ? view.account.trialEndsAt.toISOString()
            : null,
        },
      }}
    />
  );
}
