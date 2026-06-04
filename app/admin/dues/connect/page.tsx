import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";
import { DuesConnectCard } from "@/app/admin/dues/connect-card";
import { Banknote, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * /admin/dues/connect — standalone "Payouts" page. Lets a chapter admin connect
 * their own Stripe Express account so dues + donations pay out directly to the
 * chapter instead of the central platform balance.
 *
 * Admin-only: connecting a payout account routes real money. Mirrors the audit
 * page gate (member cookie → login; non-admin role → dashboard).
 *
 * This page is purely the launcher/status surface — all the conditional
 * charge-routing lives in the dues/donation checkout routes and is gated on the
 * chapter actually having a connected, charges-enabled account.
 */
export default async function DuesPayoutsPage() {
  if (!isAdminAuthed()) redirect("/admin/login?from=%2Fadmin%2Fdues%2Fconnect");
  if (!isAdminRole()) redirect("/admin");

  return (
    <main className="container py-8 max-w-2xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
      </Link>

      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
          <Banknote className="h-3 w-3" /> Treasurer
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Payouts</h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-prose">
          Connect your chapter&apos;s bank account through Stripe to receive dues
          and donation payments directly. This is optional — if you skip it,
          payments are collected centrally and reconciled to your chapter
          manually, exactly as before.
        </p>
      </div>

      <DuesConnectCard />
    </main>
  );
}
