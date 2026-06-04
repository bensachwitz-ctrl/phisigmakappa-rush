import { NextResponse } from "next/server";
import Stripe from "stripe";
import type { PrismaClient } from "@prisma/client";
import { prisma, getTenantClient, forEachTenant } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";
import { getStripe } from "@/lib/stripe";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { renderEmail, renderEmailText } from "@/lib/email-template";
import { DUES_INTRO_FEE_USED_KEY } from "@/lib/platform-billing";
import { logger, errorSink } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/dues/webhook";

/**
 * POST /api/dues/webhook
 *
 * PUBLIC endpoint — Stripe POSTs payment lifecycle events here. Because
 * Stripe calls this server-to-server with NO chapter subdomain on the Host,
 * the Host-header `prisma` proxy would resolve to the empty `public` schema
 * and the payment would never confirm against the chapter's row (which lives
 * in `schema_<sub>`). So this endpoint:
 *
 *   1. Verifies the signature with the platform's GLOBAL signing secret
 *      `process.env.STRIPE_WEBHOOK_SECRET` (the single webhook endpoint Stripe
 *      delivers ALL chapters' events to). If that env is unset we FALL BACK
 *      to the legacy per-chapter `dues.stripeWebhookSecret` (resolved via the
 *      Host proxy) for backward compatibility. Neither configured → 503.
 *
 *   2. Routes the event to the correct tenant by reading
 *      `event.data.object.metadata.subdomain` (stamped at checkout time) and
 *      binding an EXPLICIT `getTenantClient(subdomain)` — no Host needed. Only
 *      when a legacy in-flight session carries no subdomain do we fall back to
 *      the Host-proxy `prisma`.
 *
 * Idempotency: every mutation keys off DuesPayment.stripeSessionId
 * (@unique). Stripe retries failed deliveries — a second arrival of
 * `checkout.session.completed` for an already-PAID row is a no-op.
 *
 * In dev (no STRIPE_SECRET_KEY) we return 503 immediately so a stray
 * test request can't accidentally mutate data.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: "Stripe not configured" },
      { status: 503 },
    );
  }

  // SIGNATURE SECRET resolution. Prefer the platform's single GLOBAL endpoint
  // secret (new model). Fall back to the legacy per-chapter secret read via
  // the Host proxy so existing single-tenant deploys keep verifying.
  let webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!webhookSecret) {
    const cfg = await getSiteConfig().catch(
      () => ({}) as Record<string, string>,
    );
    webhookSecret = cfg["dues.stripeWebhookSecret"] || "";
  }
  if (!webhookSecret) {
    return NextResponse.json(
      { ok: false, error: "Webhook secret not configured" },
      { status: 503 },
    );
  }

  // We need the RAW body bytes — Stripe signs the exact byte sequence,
  // so reading as text and re-serializing JSON would break verification.
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    // Log the outcome only — never the raw body or the signing secret.
    errorSink(err, { route: ROUTE, outcome: "signature_verification_failed" });
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  // TENANT RESOLUTION — only AFTER the signature is verified, so an attacker
  // can't steer writes at an arbitrary schema. Route by the subdomain we
  // stamped into metadata at checkout. Legacy in-flight sessions with no
  // subdomain fall back to the Host-proxy `prisma`.
  const obj = event.data.object as any;
  const sub = obj?.metadata?.subdomain || null;
  const db: PrismaClient = sub ? getTenantClient(sub) : prisma;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(db, session, req);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutFailed(db, session, "expired", req);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(db, pi, req);
        break;
      }
      case "account.updated": {
        // Stripe Connect: a chapter's Express account capabilities changed.
        // This event carries NO metadata.subdomain (the object is an Account,
        // not a Checkout Session), so we can't use the route-level `db`. Scan
        // every tenant to find the chapter whose dues.stripeConnectAccountId
        // matches, then mirror charges/payouts flags into ITS SiteConfig.
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
        break;
      }
      default:
        // Unhandled event types — return 200 anyway so Stripe stops retrying.
        break;
    }
  } catch (err) {
    // Structured error: event type + tenant + that it failed. No payload/PII.
    errorSink(err, { route: ROUTE, eventType: event.type, tenant: sub, outcome: "handler_error" });
    // Return 500 so Stripe retries — better to re-process than drop a payment.
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // One concise success line per processed event — event type + tenant only.
  logger.info("dues.webhook.processed", { route: ROUTE, eventType: event.type, tenant: sub });
  return NextResponse.json({ ok: true });
}

async function handleCheckoutCompleted(
  db: PrismaClient,
  session: Stripe.Checkout.Session,
  req: Request,
) {
  const sessionId = session.id;
  const payment = await db.duesPayment.findUnique({
    where: { stripeSessionId: sessionId },
  });

  if (!payment) {
    // Check if it's an alumni donation instead
    const donation = await db.alumniDonation.findUnique({
      where: { stripeSessionId: sessionId },
    });
    if (donation) {
      await handleDonationCompleted(db, donation, session);
      return;
    }

    // Session ID we don't know — could be a test event, or session was
    // created outside our flow. Log and ignore. (Session id is an opaque
    // Stripe identifier, not a secret — safe to record for forensics.)
    logger.warn("dues.webhook.unknown_session", { route: ROUTE, sessionId });
    return;
  }

  // Idempotency: already-PAID rows are a no-op on replay.
  if (payment.status === "PAID") return;

  // INTRO DUES FEE consumption — for chapters on the "dues_percentage" platform
  // plan, the FIRST successful dues payment marks the intro (1.5%) cycle as used
  // so every LATER dues checkout charges the 3% standard Greekstack share. We do
  // this on the first NEW->PAID transition only (above replay guard ensures
  // once-only). Best-effort + idempotent upsert — a failure here must NEVER fail
  // the webhook (Stripe would retry a confirmed payment). Read the plan signal
  // from the metadata stamped at checkout (Stripe carries no Host/subdomain).
  await markIntroFeeUsedIfDuesPercentage(db, session);

  // Extract Stripe-provided receipt + payment intent. The receipt URL
  // is on the latest_charge — we fetch the PaymentIntent to get it.
  let receiptUrl: string | null = null;
  let paymentIntentId: string | null = null;
  if (session.payment_intent && typeof session.payment_intent === "string") {
    paymentIntentId = session.payment_intent;
    try {
      const stripe = getStripe();
      if (stripe) {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["latest_charge"],
        });
        const charge = pi.latest_charge as Stripe.Charge | null;
        receiptUrl = charge?.receipt_url || null;
      }
    } catch {
      // Best-effort — payment still PAID even without receipt URL.
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
    select: { name: true, email: true },
  }).catch(() => null);

  // Write the audit row with actorName overridden to "stripe-webhook"
  // so the chapter can see at a glance "this is a system-confirmed
  // payment, not a brother / admin action". audit() resolves actor
  // from session cookies — there's no cookie on a Stripe POST, so we
  // bypass with a direct db.auditLog.create() here.
  await db.auditLog.create({
    data: {
      actorId: null,
      actorName: "stripe-webhook",
      action: "DUES_PAID",
      subjectType: "Brother",
      subjectId: payment.brotherId,
      subjectName: brother?.name || null,
      details: `$${(payment.amountCents / 100).toFixed(2)} via Stripe — ${payment.year}`,
      ipAddress: null,
    },
  }).catch(() => {});

  // Meaningful business event — money confirmed. Amount + year + outcome only;
  // no card/PII/secret. `tenant` resolved from the session metadata subdomain.
  logger.info("dues.paid", {
    route: ROUTE,
    tenant: (session.metadata as any)?.subdomain || null,
    amountCents: payment.amountCents,
    year: payment.year,
    outcome: "paid",
  });

  // Branded dues RECEIPT email to the paying brother — BEST-EFFORT. The Stripe
  // receipt_url was captured above but never emailed (only donations got a
  // confirmation). Read THIS chapter's identity + brand color from the explicit
  // tenant db (Stripe carries no subdomain, so never the Host proxy), so a
  // payment to Beta Sigma @ Maryland isn't branded as Phi Sig @ USC. A send
  // failure must NEVER fail the webhook (Stripe would retry a confirmed payment).
  try {
    if (brother?.email) {
      const cfgRows = await db.siteConfig.findMany().catch(
        () => [] as { key: string; value: string }[],
      );
      const cfg = Object.fromEntries(cfgRows.map((r) => [r.key, r.value]));
      const id = chapterIdentityFromCfg(cfg);
      const brandHex = cfg["brand.primaryHex"] || "";
      const duesLabel = cfg["dues.label"] || `Chapter dues — ${payment.year}`;
      const amount = `$${(payment.amountCents / 100).toFixed(2)}`;
      const paidOn = now.toLocaleDateString("en-US", { dateStyle: "long" });
      const firstName = (brother.name || "").split(" ")[0] || "brother";
      const receiptRow = receiptUrl
        ? `<tr><td style="padding:6px 0;color:#71717a;">Stripe receipt</td><td style="padding:6px 0;text-align:right;"><a href="${escUrl(
            receiptUrl,
          )}" style="color:${brandHex || "#1F2937"};">View / print receipt</a></td></tr>`
        : "";
      const bodyHtml = `
        <p style="margin:0 0 16px;">Hi ${escUrl(firstName)}, thanks — your chapter dues payment was received. Here's your receipt for your records.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border:1px solid #eeeef2;border-radius:10px;padding:6px 14px;">
          <tr><td style="padding:6px 0;color:#71717a;">Item</td><td style="padding:6px 0;text-align:right;font-weight:600;">${escUrl(duesLabel)}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;">Period</td><td style="padding:6px 0;text-align:right;">${escUrl(payment.year)}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;">Amount paid</td><td style="padding:6px 0;text-align:right;font-weight:700;">${amount}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;">Date</td><td style="padding:6px 0;text-align:right;">${escUrl(paidOn)}</td></tr>
          ${receiptRow}
        </table>`;
      const html = renderEmail({
        brandHex,
        chapterName: id.chapterAttribution || id.fraternityName,
        chapterSubline: id.schoolName || undefined,
        heading: "Your dues payment receipt",
        bodyHtml,
        cta: receiptUrl ? { label: "View your Stripe receipt", url: receiptUrl } : null,
        footerNote: `Paid via Stripe to ${escUrl(id.fraternityName)}. Keep this email as your receipt.`,
      });
      await sendEmail({
        to: brother.email,
        subject: `Dues receipt — ${id.fraternityName} (${amount})`,
        html,
        text: renderEmailText({
          heading: "Your dues payment receipt",
          lines: [
            `${duesLabel} — ${payment.year}`,
            `Amount paid: ${amount} on ${paidOn}`,
            receiptUrl ? `Stripe receipt: ${receiptUrl}` : "",
          ],
          chapterName: id.chapterAttribution || id.fraternityName,
        }),
      }).catch((e) =>
        errorSink(e, { route: ROUTE, outcome: "dues_receipt_email_failed" }),
      );
    }
  } catch (e) {
    errorSink(e, { route: ROUTE, outcome: "dues_receipt_email_failed" });
  }
}

/**
 * Mark the intro dues fee as consumed for a "dues_percentage" chapter on its
 * FIRST successful dues payment. Idempotent (upsert to "true") + best-effort:
 * any failure is swallowed so a confirmed payment is never re-driven by Stripe.
 *
 * The plan signal rides in the Checkout session metadata (`platformPlan ===
 * "dues_percentage"`), stamped at checkout time — Stripe POSTs here with no Host,
 * so we can't read the central registry by subdomain proxy, and the metadata is
 * the authoritative, already-routed signal. `db` is the explicit tenant client
 * the caller resolved from metadata.subdomain. No-op for any other plan.
 */
async function markIntroFeeUsedIfDuesPercentage(
  db: PrismaClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  try {
    const meta = (session.metadata as Record<string, string> | null) || null;
    if (!meta || meta.platformPlan !== "dues_percentage") return;
    // Already consumed (the checkout saw it as used) → nothing to write.
    if (meta.introFeeUsed === "true") return;

    await db.siteConfig.upsert({
      where: { key: DUES_INTRO_FEE_USED_KEY },
      update: { value: "true" },
      create: { key: DUES_INTRO_FEE_USED_KEY, value: "true" },
    });

    logger.info("dues.intro_fee.consumed", {
      route: ROUTE,
      tenant: meta.subdomain || null,
      outcome: "intro_fee_marked_used",
    });
  } catch (e) {
    errorSink(e, { route: ROUTE, outcome: "mark_intro_fee_used_failed" });
  }
}

/** Escape plain strings for safe HTML interpolation in the receipt body. */
function escUrl(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function handleCheckoutFailed(
  db: PrismaClient,
  session: Stripe.Checkout.Session,
  reason: "expired" | "failed",
  req: Request,
) {
  const payment = await db.duesPayment.findUnique({
    where: { stripeSessionId: session.id },
  });
  if (!payment) {
    const donation = await db.alumniDonation.findUnique({
      where: { stripeSessionId: session.id },
    });
    if (donation) {
      if (donation.status === "PAID") return;
      await db.alumniDonation.update({
        where: { id: donation.id },
        data: { status: "FAILED", notes: `Session ${reason}` },
      });
    }
    return;
  }
  if (payment.status === "PAID") return; // already paid → ignore the noise

  await db.duesPayment.update({
    where: { id: payment.id },
    data: { status: "FAILED", notes: `Session ${reason}` },
  });

  const brother = await db.brother.findUnique({
    where: { id: payment.brotherId },
    select: { name: true },
  }).catch(() => null);

  await db.auditLog.create({
    data: {
      actorId: null,
      actorName: "stripe-webhook",
      action: "DUES_FAILED",
      subjectType: "Brother",
      subjectId: payment.brotherId,
      subjectName: brother?.name || null,
      details: `Session ${reason}`,
      ipAddress: null,
    },
  }).catch(() => {});
}

async function handlePaymentFailed(
  db: PrismaClient,
  pi: Stripe.PaymentIntent,
  req: Request,
) {
  // PaymentIntents don't carry our DuesPayment.id, but the session that
  // created the PI does carry it in metadata. We look up by the
  // payment_intent column we wrote on `completed`. For pre-completion
  // failures we may not have it — that's OK, the session.expired event
  // will catch it.
  const payment = await db.duesPayment.findFirst({
    where: { stripePaymentIntentId: pi.id },
  });
  if (!payment) {
    const donation = await db.alumniDonation.findFirst({
      where: { stripePaymentIntentId: pi.id },
    });
    if (donation) {
      if (donation.status === "PAID") return;
      await db.alumniDonation.update({
        where: { id: donation.id },
        data: {
          status: "FAILED",
          notes: pi.last_payment_error?.message || "Payment failed",
        },
      });
    }
    return;
  }
  if (payment.status === "PAID") return;

  await db.duesPayment.update({
    where: { id: payment.id },
    data: {
      status: "FAILED",
      notes: pi.last_payment_error?.message || "Payment failed",
    },
  });

  const brother = await db.brother.findUnique({
    where: { id: payment.brotherId },
    select: { name: true },
  }).catch(() => null);

  await db.auditLog.create({
    data: {
      actorId: null,
      actorName: "stripe-webhook",
      action: "DUES_FAILED",
      subjectType: "Brother",
      subjectId: payment.brotherId,
      subjectName: brother?.name || null,
      details: pi.last_payment_error?.message || "Payment failed",
      ipAddress: null,
    },
  }).catch(() => {});
}

async function handleDonationCompleted(
  db: PrismaClient,
  donation: any,
  session: Stripe.Checkout.Session,
) {
  if (donation.status === "PAID") return;

  let paymentIntentId: string | null = null;
  if (session.payment_intent && typeof session.payment_intent === "string") {
    paymentIntentId = session.payment_intent;
  }

  await db.alumniDonation.update({
    where: { id: donation.id },
    data: {
      status: "PAID",
      stripePaymentIntentId: paymentIntentId,
      recordedAt: new Date(),
    },
  });

  const alumni = await db.alumniProfile.findUnique({
    where: { id: donation.alumniId },
  });

  if (!alumni) return;

  // White-label the thank-you email: read THIS chapter's identity from the
  // explicit tenant db (never the Host proxy — Stripe carries no subdomain),
  // so a donation to Beta Sigma @ Maryland doesn't thank the donor on behalf
  // of Phi Sigma Kappa @ USC.
  const cfgRows = await db.siteConfig.findMany().catch(
    () => [] as { key: string; value: string }[],
  );
  const cfg = Object.fromEntries(cfgRows.map((r) => [r.key, r.value]));
  const id = chapterIdentityFromCfg(cfg);
  const brandHex = cfg["brand.primaryHex"] || "";

  // Send a branded thank-you to the alumnus. renderEmail tints the masthead
  // with the chapter's brand color (neutral fallback) and adds the chapter +
  // platform footer — consistent with every other transactional email.
  const amount = `$${(donation.amountCents / 100).toFixed(2)}`;
  const campaign = donation.campaign || "General";
  const donatedOn = new Date().toLocaleDateString("en-US", { dateStyle: "long" });
  const html = renderEmail({
    brandHex,
    chapterName: id.chapterAttribution || id.fraternityName,
    chapterSubline: id.schoolName || undefined,
    heading: "Thank you for your donation!",
    bodyHtml: `
      <p style="margin:0 0 16px;">Dear ${escUrl(alumni.fullName)}, we've successfully received your donation of ${amount} to the chapter.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border:1px solid #eeeef2;border-radius:10px;padding:6px 14px;">
        <tr><td style="padding:6px 0;color:#71717a;">Campaign</td><td style="padding:6px 0;text-align:right;font-weight:600;">${escUrl(campaign)}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a;">Amount</td><td style="padding:6px 0;text-align:right;font-weight:700;">${amount}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a;">Date</td><td style="padding:6px 0;text-align:right;">${escUrl(donatedOn)}</td></tr>
      </table>
      <p style="margin:16px 0 0;">Your contribution directly supports our members, housing operations, and scholarship programs. Thank you for your continued dedication.</p>`,
    footerNote: "Keep this email as your donation receipt.",
  });

  await sendEmail({
    to: alumni.email || "",
    subject: `Thank you for your donation to ${id.fraternityName}`,
    html,
    text: renderEmailText({
      heading: "Thank you for your donation!",
      lines: [
        `Dear ${alumni.fullName}, we've received your donation of ${amount}.`,
        `Campaign: ${campaign} · Date: ${donatedOn}`,
      ],
      chapterName: id.chapterAttribution || id.fraternityName,
    }),
  }).catch((e) => errorSink(e, { route: ROUTE, outcome: "donation_thankyou_email_failed" }));

  // Donation money confirmed — amount + campaign + outcome only.
  logger.info("alumni.donation.paid", {
    route: ROUTE,
    tenant: (session.metadata as any)?.subdomain || null,
    amountCents: donation.amountCents,
    campaign: donation.campaign || "General",
    outcome: "paid",
  });

  // Write audit log
  await db.auditLog.create({
    data: {
      actorId: null,
      actorName: "stripe-webhook",
      action: "ALUMNI_DONATION",
      subjectType: "AlumniProfile",
      subjectId: donation.alumniId,
      subjectName: alumni.fullName,
      details: `$${(donation.amountCents / 100).toFixed(2)} via Stripe — campaign: ${donation.campaign || "General"}`,
      ipAddress: null,
    },
  }).catch(() => {});
}

/**
 * Stripe Connect `account.updated` handler. ADDITIVE — touches only the
 * connect-status mirror, never any dues/donation payment row or the
 * metadata.subdomain routing above.
 *
 * The event object is a Stripe Account with no chapter subdomain, so we fan out
 * across every active tenant (forEachTenant) and update the SiteConfig of the
 * ONE chapter whose dues.stripeConnectAccountId matches this account id. Keeping
 * the SiteConfig mirror (connectChargesEnabled / connectPayoutsEnabled) in sync
 * is what lets the checkout-time gate route charges the moment Stripe enables
 * the account — without a per-payment Stripe round-trip.
 */
async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  const accountId = account.id;
  if (!accountId) return;

  const chargesEnabled = account.charges_enabled ? "true" : "false";
  const payoutsEnabled = account.payouts_enabled ? "true" : "false";

  await forEachTenant(async (tdb) => {
    const row = await tdb.siteConfig
      .findUnique({ where: { key: "dues.stripeConnectAccountId" } })
      .catch(() => null);
    // Only the chapter that owns this connected account is updated; everyone
    // else is a no-op. (forEachTenant isolates each tenant in its own try.)
    if (!row || (row.value || "").trim() !== accountId) return;

    await tdb.siteConfig.upsert({
      where: { key: "dues.connectChargesEnabled" },
      update: { value: chargesEnabled },
      create: { key: "dues.connectChargesEnabled", value: chargesEnabled },
    });
    await tdb.siteConfig.upsert({
      where: { key: "dues.connectPayoutsEnabled" },
      update: { value: payoutsEnabled },
      create: { key: "dues.connectPayoutsEnabled", value: payoutsEnabled },
    });
  });
}
