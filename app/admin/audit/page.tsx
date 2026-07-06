import Link from "next/link";
import { redirect } from "next/navigation";
import { getRecentAudit, verifyChain } from "@/lib/audit";
import { isAdminRole, isAdminAuthed } from "@/lib/auth";
import { AuditClient } from "@/components/admin/audit-client";
import { ScrollText, ArrowLeft, ShieldCheck, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * /admin/audit — chapter governance trail. Shows the most recent 50 events
 * (status changes, votes, dues toggles, broadcasts, settings changes,
 * deletions) with client-side search + subject/actor filters so the e-board
 * can answer "who did what when" months later.
 *
 * Admin-only because the log surfaces actor names + IPs.
 */
export default async function AuditPage() {
  if (!isAdminAuthed()) redirect("/admin/login?from=%2Fadmin%2Faudit");
  if (!isAdminRole()) redirect("/admin");

  const [rows, chain] = await Promise.all([getRecentAudit(50), verifyChain()]);

  return (
    <div className="container py-8 max-w-4xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
      </Link>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
            <ScrollText className="h-3 w-3" aria-hidden="true" /> Governance
          </span>
          {/* Tamper-evidence badge — verifyChain() recomputes the hash chain over
              every chained row. Green only when the full chain is intact; red
              (with the broken seq) the moment any historical row was edited,
              deleted, or reordered. Legacy pre-chain rows are excluded. */}
          {chain.ok ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
              title={`Hash chain verified across ${chain.chainedRows} record${chain.chainedRows === 1 ? "" : "s"}${chain.legacyRows ? ` (+${chain.legacyRows} legacy)` : ""}.`}
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Integrity verified
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-700"
              title={`Chain check failed: ${chain.reason || "unknown"}${chain.brokenAtSeq != null ? ` at sequence #${chain.brokenAtSeq}` : ""}.`}
            >
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              Integrity check failed
              {chain.brokenAtSeq != null ? ` (#${chain.brokenAtSeq})` : ""}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
          Every status change, vote, dues toggle, broadcast, and deletion is recorded here.
          Use this when a brother asks "who changed that?" or when nationals does a
          chapter audit. Retained for 1 year, then auto-pruned by a daily cron.
        </p>
      </div>

      <AuditClient initialRows={rows} />
    </div>
  );
}
