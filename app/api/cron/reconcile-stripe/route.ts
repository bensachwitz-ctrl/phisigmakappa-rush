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
  reversed: number;
};

// ── REVERSAL BACKSTOP (refund / dispute) ─────────────────────────────────────
// The Stripe webhook (charge.refunded / charge.dispute.*) is the primary path
// that reverses a PAID row when money is given back. A DROPPED such webhook
// leaves a refunded/disputed DuesPayment (or AlumniDonation) stuck PAID — money
// left Stripe while the ledger still claims it AND the brother keeps a paid
// badge. This cron is the belt: it LISTS recent refunds + disputes from Stripe
// ONCE per run (cheap, only real reversals surface — not every PAID row), then
// each tenant reconciles any of its still-PAID rows whose PaymentIntent shows up
// in that list, applying the SAME reversal the webhook would.
//
// COVERAGE WINDOW: only refunds/disputes CREATED within this window are swept.
// Generous enough to cover the common refund window and the ~120-day card
// dispute window; a reversal older than this is out of scope for the belt (the
// webhook is the primary path). Bounded item cap guards a pathological run.
const REVERSAL_LOOKBACK_MS = 130 * 24 * 60 * 60 * 1000; // ~130 days
const REVERSAL_MAX_ITEMS = 500; // cap refunds/disputes scanned per run (each list)

/** A reversal Stripe reports for one PaymentIntent, normalized for the sweep. */
type ReversalIntent = {
  full: boolean; // full reversal (clears the brother's dues badge) vs partial
  cause: "refund" | "dispute";
  refundedCents: number;
};
/** PaymentIntent id → the reversal to apply. */
type ReversalMap = Map<string, ReversalIntent>;

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

  // REVERSAL BACKSTOP — list recent refunds + disputes ONCE (account-wide) so the
  // per-tenant sweep can reconcile dropped reversal webhooks with a single
  // indexed query per tenant and ZERO extra Stripe calls per row. Best-effort: an
  // empty map just means no reversal backstop this run (never fails the cron).
  let reversalMap: ReversalMap = new Map();
  try {
    reversalMap = await listRecentReversals(stripe, new Date(Date.now() - REVERSAL_LOOKBACK_MS));
  } catch (err) {
    errorSink(err, { route: ROUTE, outcome: "reversal_list_failed" });
  }

  let perTenant: Array<{
    tenant: string;
    ok: boolean;
    result?: TenantReconcile;
    error?: string;
  }>;
  try {
    perTenant = await forEachTenant(async (db) => reconcileTenant(db, stripe, cutoff, reversalMap));
  } catch (err) {
    errorSink(err, { route: ROUTE, outcome: "catastrophic_failure" });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown failure" },
      { status: 500 },
    );
  }

  const totals = { reconciled: 0, failed: 0, checked: 0, reversed: 0 };
  const tenants = perTenant.map((t) => {
    if (t.ok && t.result) {
      totals.reconciled += t.result.reconciled;
      totals.failed += t.result.failed;
      totals.checked += t.result.checked;
      totals.reversed += t.result.reversed;
      return {
        tenant: t.tenant,
        ok: true as const,
        reconciled: t.result.reconciled,
        failed: t.result.failed,
        checked: t.result.checked,
        reversed: t.result.reversed,
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
    reversed: totals.reversed,
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
  reversalMap: ReversalMap,
): Promise<TenantReconcile> {
  let reconciled = 0;
  let failed = 0;
  let checked = 0;
  let reversed = 0;

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

  // ── REVERSALS (refund / dispute backstop) ─────────────────────────────────
  // Reconcile any still-PAID dues/donation row whose PaymentIntent appears in
  // the account-wide refund/dispute list (a reversal whose webhook was dropped).
  // One indexed query per table; NO per-row Stripe calls. Idempotent: we only
  // ever act on a status="PAID" row, and the reversal flips it out of PAID so a
  // later run re-checking the same PI is a clean no-op.
  const reversalPiIds = [...reversalMap.keys()];
  if (reversalPiIds.length > 0) {
    const paidDues = await db.duesPayment
      .findMany({ where: { status: "PAID", stripePaymentIntentId: { in: reversalPiIds } } })
      .catch(() => [] as any[]);
    for (const payment of paidDues) {
      const intent = payment.stripePaymentIntentId
        ? reversalMap.get(payment.stripePaymentIntentId)
        : undefined;
      if (!intent) continue;
      try {
        if (await applyDuesReversal(db, payment, intent)) reversed++;
      } catch (err) {
        errorSink(err, {
          route: ROUTE,
          kind: "dues_reversal",
          paymentId: payment.id,
          outcome: "row_reconcile_failed",
        });
      }
    }

    // Donations: only a FULL reversal (full refund OR dispute) drops a donation
    // out of PAID. A PARTIAL donation refund intentionally STAYS PAID (mirrors
    // the webhook — it must not fall out of PAID-only "donations raised"), so
    // there is no stuck state for the belt to fix; skip it here (also keeps this
    // sweep idempotent — a partial would otherwise re-audit every run).
    const paidDonations = await db.alumniDonation
      .findMany({ where: { status: "PAID", stripePaymentIntentId: { in: reversalPiIds } } })
      .catch(() => [] as any[]);
    for (const donation of paidDonations) {
      const intent = donation.stripePaymentIntentId
        ? reversalMap.get(donation.stripePaymentIntentId)
        : undefined;
      if (!intent || !intent.full) continue;
      try {
        if (await applyDonationReversal(db, donation, intent)) reversed++;
      } catch (err) {
        errorSink(err, {
          route: ROUTE,
          kind: "donation_reversal",
          donationId: donation.id,
          outcome: "row_reconcile_failed",
        });
      }
    }
  }

  return { reconciled, failed, checked, reversed };
}

/**
 * List recent refunds + disputes from Stripe and normalize them into a
 * PaymentIntent → ReversalIntent map. Account-wide (Stripe carries no chapter
 * subdomain), listed ONCE per cron run so the per-tenant sweep needs no per-row
 * Stripe calls. Both lists are bounded (created ≥ `since`, capped item count).
 *
 * Semantics mirror the webhook's reverseByPaymentIntent:
 *   • refund → full when the charge's cumulative amount_refunded ≥ amount, else
 *     partial (kept so the dues badge-clear only fires on a full refund);
 *   • dispute → a FULL reversal, EXCEPT a "won" dispute (funds restored to the
 *     chapter) which is NOT a reversal and is skipped. Disputes take precedence
 *     over a refund on the same PaymentIntent.
 */
async function listRecentReversals(
  stripe: NonNullable<ReturnType<typeof getStripe>>,
  since: Date,
): Promise<ReversalMap> {
  const map: ReversalMap = new Map();
  const createdGte = Math.floor(since.getTime() / 1000);

  // 1. Recent refunds — expand the charge so we can tell full vs partial from the
  //    cumulative amount_refunded (all refunds on one charge report the same
  //    current cumulative total, so order doesn't matter).
  const refunds = await stripe.refunds
    .list({ created: { gte: createdGte }, limit: 100, expand: ["data.charge"] })
    .autoPagingToArray({ limit: REVERSAL_MAX_ITEMS });
  for (const refund of refunds) {
    const piId =
      typeof refund.payment_intent === "string"
        ? refund.payment_intent
        : refund.payment_intent?.id || null;
    if (!piId) continue;
    const charge =
      refund.charge && typeof refund.charge !== "string" ? refund.charge : null;
    const amount = charge?.amount ?? 0;
    const refunded = charge?.amount_refunded ?? refund.amount ?? 0;
    const full = amount > 0 ? refunded >= amount : true;
    map.set(piId, { full, cause: "refund", refundedCents: refunded });
  }

  // 2. Recent disputes — a WON dispute means the funds were restored to the
  //    chapter, so it is NOT a reversal (skip). Any other status (open / lost)
  //    means the funds are withdrawn → full reversal. Dispute wins precedence.
  const disputes = await stripe.disputes
    .list({ created: { gte: createdGte }, limit: 100 })
    .autoPagingToArray({ limit: REVERSAL_MAX_ITEMS });
  for (const dispute of disputes) {
    const piId =
      typeof dispute.payment_intent === "string"
        ? dispute.payment_intent
        : dispute.payment_intent?.id || null;
    if (!piId) continue;
    if (dispute.status === "won") {
      // Funds restored — never a reversal. If a refund on the same PI was also
      // listed, the dispute-won signal wins: drop any refund entry for this PI.
      map.delete(piId);
      continue;
    }
    map.set(piId, { full: true, cause: "dispute", refundedCents: 0 });
  }

  return map;
}

/**
 * Apply a dropped-webhook DUES reversal, mirroring the dues branch of the
 * webhook's reverseByPaymentIntent. Re-reads the row inside so a webhook that
 * landed between the list and now is a no-op (only a still-PAID row is touched):
 *   • full  → row REFUNDED + clear the brother's duesPaid badge & dues mirror;
 *   • partial → row REFUNDED, badge kept (they paid the term; treasurer
 *     reconciles the partial). Audited as "stripe-reconcile". Returns whether it
 *     applied a change.
 */
async function applyDuesReversal(
  db: PrismaClient,
  payment: { id: string; brotherId: string; amountCents: number; year: string },
  intent: ReversalIntent,
): Promise<boolean> {
  const fresh = await db.duesPayment
    .findUnique({ where: { id: payment.id }, select: { status: true } })
    .catch(() => null);
  if (!fresh || fresh.status !== "PAID") return false; // webhook already handled it

  const note =
    intent.cause === "dispute"
      ? "Chargeback/dispute opened (reconciled)"
      : "Refunded via Stripe (reconciled)";

  if (intent.full) {
    await db
      .$transaction([
        db.duesPayment.update({
          where: { id: payment.id },
          data: { status: "REFUNDED", notes: note },
        }),
        db.brother.update({
          where: { id: payment.brotherId },
          data: { duesPaid: false, duesPaidAt: null, duesPaymentId: null },
        }),
      ])
      .catch(async () => {
        // If the brother update fails (row gone), still mark the payment.
        await db.duesPayment
          .update({ where: { id: payment.id }, data: { status: "REFUNDED", notes: note } })
          .catch(() => {});
      });
  } else {
    await db.duesPayment
      .update({ where: { id: payment.id }, data: { status: "REFUNDED", notes: note } })
      .catch(() => {});
  }

  const brother = await db.brother
    .findUnique({ where: { id: payment.brotherId }, select: { name: true } })
    .catch(() => null);

  await db.auditLog
    .create({
      data: {
        actorId: null,
        actorName: "stripe-reconcile",
        action: intent.cause === "dispute" ? "DUES_DISPUTED" : "DUES_REFUNDED",
        subjectType: "Brother",
        subjectId: payment.brotherId,
        subjectName: brother?.name || null,
        details: `$${(payment.amountCents / 100).toFixed(2)} — ${note}${intent.full ? " (full)" : " (partial)"} · ${payment.year}`,
        ipAddress: null,
      },
    })
    .catch(() => {});

  logger.info("dues.reversed", {
    route: ROUTE,
    outcome: intent.cause === "dispute" ? "disputed" : "refunded",
    full: intent.full,
    amountCents: payment.amountCents,
    reconciled: true,
  });
  return true;
}

/**
 * Apply a dropped-webhook DONATION reversal (full only — partial donation
 * refunds intentionally stay PAID). Mirrors the donation branch of the webhook's
 * reverseByPaymentIntent. Re-reads inside so a webhook that landed first is a
 * no-op. Returns whether it applied a change.
 */
async function applyDonationReversal(
  db: PrismaClient,
  donation: { id: string; alumniId: string; amountCents: number; campaign: string | null },
  intent: ReversalIntent,
): Promise<boolean> {
  const fresh = await db.alumniDonation
    .findUnique({ where: { id: donation.id }, select: { status: true } })
    .catch(() => null);
  if (!fresh || fresh.status !== "PAID") return false;

  const note =
    intent.cause === "dispute"
      ? "Chargeback/dispute opened (reconciled)"
      : "Refunded via Stripe (reconciled)";

  await db.alumniDonation
    .update({ where: { id: donation.id }, data: { status: "REFUNDED", notes: note } })
    .catch(() => {});

  const alum = await db.alumniProfile
    .findUnique({ where: { id: donation.alumniId }, select: { fullName: true } })
    .catch(() => null);

  await db.auditLog
    .create({
      data: {
        actorId: null,
        actorName: "stripe-reconcile",
        action: intent.cause === "dispute" ? "ALUMNI_DONATION_DISPUTED" : "ALUMNI_DONATION_REFUNDED",
        subjectType: "AlumniProfile",
        subjectId: donation.alumniId,
        subjectName: alum?.fullName || null,
        details: `$${(donation.amountCents / 100).toFixed(2)} — ${note} · campaign: ${donation.campaign || "General"}`,
        ipAddress: null,
      },
    })
    .catch(() => {});

  logger.info("alumni.donation.reversed", {
    route: ROUTE,
    outcome: intent.cause === "dispute" ? "disputed" : "refunded",
    amountCents: donation.amountCents,
    reconciled: true,
  });
  return true;
}
