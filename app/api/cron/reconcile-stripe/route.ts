import { NextResponse } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { forEachTenant } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET|POST /api/cron/reconcile-stripe
 *
 * Webhook SAFETY NET. The Stripe webhook (/api/dues/webhook) is the primary
 * path that confirms dues + donations, but webhooks can be missed: a bad
 * signing-secret window, a deploy mid-delivery, a Stripe outage, a dropped
 * retry. This cron sweeps every active chapter for PENDING rows that already
 * have a Stripe Checkout session and reconciles them against Stripe's source
 * of truth:
 *
 *   - session.payment_status === "paid"  → apply the SAME PAID transition the
 *     webhook applies (dues: DuesPayment PAID + Brother dues fields in one
 *     transaction + audit row; donation: AlumniDonation PAID).
 *   - session.status === "expired"        → mark the row FAILED.
 *   - anything else (still open/unpaid)   → leave it; a later run re-checks.
 *
 * Idempotent: already-PAID rows are filtered out by the query, and each
 * transition re-checks status before writing, so a row the webhook just
 * confirmed is a no-op here. Every row is wrapped in its own try/catch so one
 * bad session can't abort a chapter's sweep, and `forEachTenant` isolates each
 * chapter so one bad schema can't abort the run.
 *
 * Only sweeps rows older than 10 minutes so we don't race the webhook on a
 * payment that's still settling.
 *
 * Auth gate mirrors /api/cron/send-scheduled-announcements:
 * `?secret=<CRON_SECRET>` query OR `Authorization: Bearer <CRON_SECRET>`
 * header. Without a CRON_SECRET env (local dev) we reject every external
 * caller and allow only localhost.
 */

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Local dev / unconfigured prod — reject every external caller.
    // Localhost is allowed so the developer can curl their own laptop.
    const fwd = req.headers.get("x-forwarded-for") || "";
    const host = req.headers.get("host") || "";
    if (fwd && !/^127\.|^::1|^localhost/.test(fwd.split(",")[0].trim())) return false;
    if (host && !/^localhost|^127\.0\.0\.1|^::1/.test(host)) return false;
    return true;
  }
  // Production — secret must match.
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("secret");
  if (fromQuery && fromQuery === secret) return true;
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ") && auth.slice(7) === secret) return true;
  return false;
}

type TenantReconcile = {
  reconciled: number;
  failed: number;
  checked: number;
};

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    // Stripe not configured for this deploy — nothing to reconcile. 200 so a
    // Vercel cron invocation doesn't show as a failure.
    return NextResponse.json({ ok: true, skipped: "Stripe not configured" });
  }

  // Only touch rows at least 10 minutes old — younger PENDING rows are still
  // in the webhook's settling window and shouldn't be raced.
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);

  let perTenant: Array<{
    tenant: string;
    ok: boolean;
    result?: TenantReconcile;
    error?: string;
  }>;
  try {
    perTenant = await forEachTenant(async (db) => reconcileTenant(db, stripe, cutoff));
  } catch (err) {
    console.error("[cron/reconcile-stripe] catastrophic failure:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown failure" },
      { status: 500 },
    );
  }

  const totals = { reconciled: 0, failed: 0, checked: 0 };
  const tenants = perTenant.map((t) => {
    if (t.ok && t.result) {
      totals.reconciled += t.result.reconciled;
      totals.failed += t.result.failed;
      totals.checked += t.result.checked;
      return {
        tenant: t.tenant,
        ok: true as const,
        reconciled: t.result.reconciled,
        failed: t.result.failed,
        checked: t.result.checked,
      };
    }
    return { tenant: t.tenant, ok: false as const, error: t.error };
  });

  const ok = tenants.every((t) => t.ok);
  return NextResponse.json({ ok, ...totals, perTenant: tenants });
}

// POST shares the path so ops + Vercel Cron can both invoke it.
export const POST = GET;

/**
 * Reconcile a single chapter's PENDING dues + donations against Stripe.
 * Mirrors the webhook's PAID/FAILED transitions exactly so the two paths are
 * interchangeable. Each row is isolated in its own try/catch.
 */
async function reconcileTenant(
  db: PrismaClient,
  stripe: NonNullable<ReturnType<typeof getStripe>>,
  cutoff: Date,
): Promise<TenantReconcile> {
  let reconciled = 0;
  let failed = 0;
  let checked = 0;

  // ── DUES ────────────────────────────────────────────────────────────────
  const duesPending = await db.duesPayment.findMany({
    where: {
      status: "PENDING",
      stripeSessionId: { not: null },
      createdAt: { lt: cutoff },
    },
  });

  for (const payment of duesPending) {
    if (!payment.stripeSessionId) continue;
    checked++;
    try {
      const s = await stripe.checkout.sessions.retrieve(payment.stripeSessionId);

      if (s.payment_status === "paid") {
        // Re-read to stay idempotent against a webhook that just landed.
        const fresh = await db.duesPayment.findUnique({ where: { id: payment.id } });
        if (!fresh || fresh.status === "PAID") continue;

        // Best-effort receipt + payment intent, exactly like the webhook.
        let receiptUrl: string | null = null;
        let paymentIntentId: string | null = null;
        if (s.payment_intent && typeof s.payment_intent === "string") {
          paymentIntentId = s.payment_intent;
          try {
            const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
              expand: ["latest_charge"],
            });
            const charge = pi.latest_charge as any;
            receiptUrl = charge?.receipt_url || null;
          } catch {
            // receipt is best-effort
          }
        }

        const now = new Date();
        await db.$transaction([
          db.duesPayment.update({
            where: { id: payment.id },
            data: {
              status: "PAID",
              stripePaymentIntentId: paymentIntentId,
              receiptUrl,
            },
          }),
          db.brother.update({
            where: { id: payment.brotherId },
            data: {
              duesPaid: true,
              duesPaidAt: now,
              duesPaymentMethod: "STRIPE",
              duesPaymentId: payment.id,
              duesAmountCents: payment.amountCents,
              duesYear: payment.year,
            },
          }),
        ]);

        const brother = await db.brother.findUnique({
          where: { id: payment.brotherId },
          select: { name: true },
        }).catch(() => null);

        await db.auditLog.create({
          data: {
            actorId: null,
            actorName: "stripe-reconcile",
            action: "DUES_PAID",
            subjectType: "Brother",
            subjectId: payment.brotherId,
            subjectName: brother?.name || null,
            details: `$${(payment.amountCents / 100).toFixed(2)} via Stripe — ${payment.year} (reconciled)`,
            ipAddress: null,
          },
        }).catch(() => {});

        reconciled++;
      } else if (s.status === "expired") {
        const fresh = await db.duesPayment.findUnique({ where: { id: payment.id } });
        if (!fresh || fresh.status === "PAID") continue;
        await db.duesPayment.update({
          where: { id: payment.id },
          data: { status: "FAILED", notes: "Session expired (reconciled)" },
        });

        const brother = await db.brother.findUnique({
          where: { id: payment.brotherId },
          select: { name: true },
        }).catch(() => null);

        await db.auditLog.create({
          data: {
            actorId: null,
            actorName: "stripe-reconcile",
            action: "DUES_FAILED",
            subjectType: "Brother",
            subjectId: payment.brotherId,
            subjectName: brother?.name || null,
            details: "Session expired (reconciled)",
            ipAddress: null,
          },
        }).catch(() => {});

        failed++;
      }
      // else: still open / unpaid — leave it for a later run.
    } catch (err) {
      console.error(
        `[cron/reconcile-stripe] dues ${payment.id} (${payment.stripeSessionId}) failed:`,
        err,
      );
    }
  }

  // ── DONATIONS ─────────────────────────────────────────────────────────────
  const donationsPending = await db.alumniDonation.findMany({
    where: {
      status: "PENDING",
      stripeSessionId: { not: null },
      recordedAt: { lt: cutoff },
    },
  });

  for (const donation of donationsPending) {
    if (!donation.stripeSessionId) continue;
    checked++;
    try {
      const s = await stripe.checkout.sessions.retrieve(donation.stripeSessionId);

      if (s.payment_status === "paid") {
        const fresh = await db.alumniDonation.findUnique({ where: { id: donation.id } });
        if (!fresh || fresh.status === "PAID") continue;

        let paymentIntentId: string | null = null;
        if (s.payment_intent && typeof s.payment_intent === "string") {
          paymentIntentId = s.payment_intent;
        }

        await db.alumniDonation.update({
          where: { id: donation.id },
          data: {
            status: "PAID",
            stripePaymentIntentId: paymentIntentId,
            recordedAt: new Date(),
          },
        });

        await db.auditLog.create({
          data: {
            actorId: null,
            actorName: "stripe-reconcile",
            action: "ALUMNI_DONATION",
            subjectType: "AlumniProfile",
            subjectId: donation.alumniId,
            subjectName: null,
            details: `$${(donation.amountCents / 100).toFixed(2)} via Stripe — campaign: ${donation.campaign || "General"} (reconciled)`,
            ipAddress: null,
          },
        }).catch(() => {});

        reconciled++;
      } else if (s.status === "expired") {
        const fresh = await db.alumniDonation.findUnique({ where: { id: donation.id } });
        if (!fresh || fresh.status === "PAID") continue;
        await db.alumniDonation.update({
          where: { id: donation.id },
          data: { status: "FAILED", notes: "Session expired (reconciled)" },
        });
        failed++;
      }
      // else: still open / unpaid — leave it for a later run.
    } catch (err) {
      console.error(
        `[cron/reconcile-stripe] donation ${donation.id} (${donation.stripeSessionId}) failed:`,
        err,
      );
    }
  }

  return { reconciled, failed, checked };
}
