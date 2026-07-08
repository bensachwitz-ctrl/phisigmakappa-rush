import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { centralDb, forEachTenant } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { logger, errorSink } from "@/lib/logger";
import { markDuesIntroFeeUsedFromSession } from "@/lib/platform-billing";
import { publishTenantIfPendingBilling, customerHasUsableCard } from "@/lib/publish-tenant";
import { sendDuesPaidReceipt } from "@/lib/dues-receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/cron/reconcile-stripe";

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
 * Auth gate: PREFER `Authorization: Bearer <CRON_SECRET>` (Vercel Cron stamps
 * this automatically when CRON_SECRET is set) compared in CONSTANT TIME, and the
 * platform-only `x-vercel-cron` header (which Vercel strips from external
 * requests). The `?secret=<CRON_SECRET>` query form is kept for back-compat/ops
 * curls but also compared in constant time. Without a CRON_SECRET env (local dev)
 * we reject every external caller and allow only localhost.
 */

/** Constant-time string compare (length-guarded) so a secret check can't leak the
 *  secret byte-by-byte via response-timing. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

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
  // Genuine Vercel Cron invocation — Vercel sets this header and strips any
  // inbound copy from external requests, so its presence is a trusted signal.
  if (req.headers.get("x-vercel-cron")) return true;
  // Production — secret must match (constant-time).
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ") && safeEqual(auth.slice(7), secret)) return true;
  const fromQuery = new URL(req.url).searchParams.get("secret");
  if (fromQuery && safeEqual(fromQuery, secret)) return true;
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
    errorSink(err, { route: ROUTE, outcome: "catastrophic_failure" });
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

  // PENDING-BILLING PUBLISH SWEEP (CARD-REQUIRED-TO-PUBLISH safety net). The
  // platform-billing webhook publishes a card-free chapter the moment it adds a
  // card (subscription events / payment_method.attached / setup_intent.succeeded /
  // customer.updated). This is the belt for a MISSED such webhook: sweep every
  // INACTIVE chapter that has a Stripe customer — the dues fan-out above uses
  // forEachTenant, which iterates ACTIVE tenants only and can never reach a
  // pending (isActive=false) chapter — and publish it if a usable card is now on
  // file. Publish is gated on the onboard-seeded pending flag inside
  // publishTenantIfPendingBilling (isActive=false + billing.pendingActivation
  // "true"), so an operator hard-suspend (flag cleared to "false" on suspend) is
  // NEVER re-activated. Fully isolated + best-effort so it can never affect — or
  // fail — the dues/donation reconciliation above.
  let published = 0;
  try {
    published = await sweepPendingBillingPublish(stripe);
  } catch (err) {
    errorSink(err, { route: ROUTE, outcome: "pending_publish_sweep_failed" });
  }

  // Structured run summary for the ops log — aggregate counts only. We emit at
  // info when everything's clean, warn when a tenant errored, so the run-log is
  // filterable by level.
  const summaryCtx = {
    route: ROUTE,
    reconciled: totals.reconciled,
    failed: totals.failed,
    checked: totals.checked,
    published,
    tenantCount: tenants.length,
  };
  if (ok) logger.info("cron.reconcile_stripe.run", summaryCtx);
  else logger.warn("cron.reconcile_stripe.run", { ...summaryCtx, outcome: "partial_failure" });

  return NextResponse.json({ ok, ...totals, published, perTenant: tenants });
}

/**
 * Publish any card-free chapter that has since added a card but was left dark by a
 * missed webhook. Reads the central registry directly for INACTIVE chapters that
 * carry a Stripe customer (forEachTenant can't reach them — it's active-only), and
 * for each, publishes iff a usable card is on file. publishTenantIfPendingBilling
 * enforces the pending-flag gate (so an operator hard-suspend stays down) and is
 * idempotent, so a chapter the webhook already published is a clean no-op here.
 * Every step is best-effort — a registry read failure returns 0 rather than
 * throwing (keeping the whole sweep non-fatal to the cron).
 */
async function sweepPendingBillingPublish(
  stripe: NonNullable<ReturnType<typeof getStripe>>,
): Promise<number> {
  let inactive: Array<{ subdomain: string; stripeCustomerId: string | null }>;
  try {
    inactive = await centralDb.tenant.findMany({
      where: { isActive: false, stripeCustomerId: { not: null } },
      select: { subdomain: true, stripeCustomerId: true },
    });
  } catch (err) {
    errorSink(err, { route: ROUTE, outcome: "pending_publish_registry_read_failed" });
    return 0;
  }

  let published = 0;
  for (const t of inactive) {
    try {
      if (!t.stripeCustomerId) continue;
      if (!(await customerHasUsableCard(stripe, t.stripeCustomerId))) continue;
      const didPublish = await publishTenantIfPendingBilling(t.subdomain, { route: ROUTE });
      if (didPublish) published++;
    } catch (err) {
      errorSink(err, { route: ROUTE, tenant: t.subdomain, outcome: "pending_publish_row_failed" });
    }
  }
  return published;
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

        // Generate the branded PDF receipt + email it to the brother — the SAME
        // receipt side-effect the webhook applies, via the shared helper. Before
        // this, a payment confirmed by THIS safety-net cron (a dropped webhook —
        // exactly the case the cron exists for) silently gave the brother no PDF
        // and no receipt email. Best-effort; runs once per row (the fresh/PAID
        // guard above makes a re-run a no-op, so no duplicate emails). Returns
        // the branded URL (falling back to Stripe's) to persist + the brother
        // name for the audit row below.
        //
        // CRITICAL: the receipt is BEST-EFFORT and must NEVER block the payment
        // confirmation. Any throw here falls back to the Stripe receipt URL + a
        // null name so the PAID transaction below still commits — a receipt/PDF
        // failure can't strand a confirmed payment as PENDING.
        let finalReceiptUrl: string | null = receiptUrl;
        let receiptBrotherName: string | null = null;
        try {
          const receiptOut = await sendDuesPaidReceipt(db, {
            paymentId: payment.id,
            brotherId: payment.brotherId,
            amountCents: payment.amountCents,
            year: payment.year,
            paidAt: now,
            paymentIntentId,
            stripeReceiptUrl: receiptUrl,
            route: ROUTE,
          });
          finalReceiptUrl = receiptOut.finalReceiptUrl;
          receiptBrotherName = receiptOut.brotherName;
        } catch (e) {
          errorSink(e, {
            route: ROUTE,
            kind: "dues",
            paymentId: payment.id,
            outcome: "dues_receipt_side_effect_failed",
          });
        }

        await db.$transaction([
          db.duesPayment.update({
            where: { id: payment.id },
            data: {
              status: "PAID",
              stripePaymentIntentId: paymentIntentId,
              receiptUrl: finalReceiptUrl,
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

        // Consume the dues_percentage intro fee — the SAME PAID-side effect the
        // webhook applies (markDuesIntroFeeUsedFromSession). Without this, a
        // chapter whose FIRST dues payment is confirmed by this safety-net cron
        // (a dropped webhook — exactly why the cron exists) would never flip
        // dues.introFeeUsed and would be billed the 1.5% intro rate forever.
        // Best-effort + idempotent inside the helper; reads the plan signal from
        // the session metadata stamped at checkout.
        const introFlipped = await markDuesIntroFeeUsedFromSession(db, s, (e) =>
          errorSink(e, {
            route: ROUTE,
            kind: "dues",
            paymentId: payment.id,
            outcome: "mark_intro_fee_used_failed",
          }),
        );
        if (introFlipped) {
          logger.info("dues.intro_fee.consumed", {
            route: ROUTE,
            paymentId: payment.id,
            outcome: "intro_fee_marked_used_reconcile",
          });
        }

        await db.auditLog.create({
          data: {
            actorId: null,
            actorName: "stripe-reconcile",
            action: "DUES_PAID",
            subjectType: "Brother",
            subjectId: payment.brotherId,
            // reuse the brother name the receipt helper already resolved
            subjectName: receiptBrotherName,
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
      // Per-row failure is isolated — record id + session (opaque, non-secret).
      errorSink(err, {
        route: ROUTE,
        kind: "dues",
        paymentId: payment.id,
        sessionId: payment.stripeSessionId,
        outcome: "row_reconcile_failed",
      });
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
      errorSink(err, {
        route: ROUTE,
        kind: "donation",
        donationId: donation.id,
        sessionId: donation.stripeSessionId,
        outcome: "row_reconcile_failed",
      });
    }
  }

  return { reconciled, failed, checked };
}
