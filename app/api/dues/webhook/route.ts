import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";
import { getStripe } from "@/lib/stripe";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { getChapterIdentity } from "@/lib/chapter-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/dues/webhook
 *
 * PUBLIC endpoint — Stripe POSTs payment lifecycle events here. We
 * authenticate every request with `stripe.webhooks.constructEvent`
 * using the chapter's `dues.stripeWebhookSecret` (whsec_...). A
 * missing or invalid signature → 400, NO DB writes.
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

  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const webhookSecret = cfg["dues.stripeWebhookSecret"] || "";
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
    console.error("[/api/dues/webhook] signature verification failed:", err?.message);
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, req);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutFailed(session, "expired", req);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(pi, req);
        break;
      }
      default:
        // Unhandled event types — return 200 anyway so Stripe stops retrying.
        break;
    }
  } catch (err) {
    console.error("[/api/dues/webhook] handler error:", err);
    // Return 500 so Stripe retries — better to re-process than drop a payment.
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  req: Request,
) {
  const sessionId = session.id;
  const payment = await prisma.duesPayment.findUnique({
    where: { stripeSessionId: sessionId },
  });

  if (!payment) {
    // Check if it's an alumni donation instead
    const donation = await prisma.alumniDonation.findUnique({
      where: { stripeSessionId: sessionId },
    });
    if (donation) {
      await handleDonationCompleted(donation, session);
      return;
    }

    // Session ID we don't know — could be a test event, or session was
    // created outside our flow. Log and ignore.
    console.warn("[/api/dues/webhook] unknown session:", sessionId);
    return;
  }

  // Idempotency: already-PAID rows are a no-op on replay.
  if (payment.status === "PAID") return;

  // SECURITY: only mark PAID when Stripe confirms the money actually landed
  // AND the charged amount matches what we created the session for. Checkout
  // can emit `completed` with payment_status "unpaid" (async/delayed methods),
  // and co-sign/reminder links are long-lived — never grant good-standing on
  // an unconfirmed or mismatched charge. Leave it PENDING for reconciliation.
  if (session.payment_status && session.payment_status !== "paid") {
    console.warn(`[/api/dues/webhook] session ${sessionId} completed but payment_status=${session.payment_status}; leaving PENDING`);
    return;
  }
  if (typeof session.amount_total === "number" && session.amount_total !== payment.amountCents) {
    console.error(`[/api/dues/webhook] amount mismatch for ${sessionId}: stripe=${session.amount_total} expected=${payment.amountCents}; leaving PENDING`);
    return;
  }

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
  await prisma.$transaction([
    prisma.duesPayment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        stripePaymentIntentId: paymentIntentId,
        receiptUrl,
      },
    }),
    prisma.brother.update({
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

  const brother = await prisma.brother.findUnique({
    where: { id: payment.brotherId },
    select: { name: true, email: true },
  }).catch(() => null);

  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));

  // Send notifications if paid by co-signer
  const coSignerEmail = session.metadata?.coSignerEmail;
  if (coSignerEmail && brother) {
    let identity;
    try {
      identity = await getChapterIdentity();
    } catch {
      identity = {
        chapterFullName: "Phi Sigma Kappa Gamma Triton",
        chapterAttribution: "Phi Sig USC",
      };
    }
    const replyToEmail = cfg["contact.rushEmail"] || "rush@yourchapter.com";
    const primaryColorHex = cfg["brand.primaryHex"] || "#C8102E";

    // 1. Email to Brother
    if (brother.email) {
      const brotherSubject = `Parent Payment Received — Good Standing Confirmed`;
      const brotherHtml = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
    <h2 style="color: ${primaryColorHex}; margin: 0; font-family: Georgia, serif;">${identity.chapterFullName}</h2>
    <p style="color: #6b7280; font-size: 11px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">Payment Status Confirmed</p>
  </div>
  <div style="color: #1f2937; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
    <p>Hey ${brother.name.split(" ")[0]},</p>
    <p>Good news! Your parent/co-signer (<strong>${coSignerEmail}</strong>) has successfully paid your semester dues of <strong>$${(payment.amountCents / 100).toFixed(2)}</strong> for the <strong>${payment.year.toUpperCase()}</strong> academic term.</p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin: 20px 0; text-align: center; color: #166534; font-weight: 700; font-size: 14px;">
      &bull; Good Standing Active &bull;
    </div>
    
    <p>Your profile is marked as PAID, and you are cleared for chapter voting, social functions, and active events.</p>
  </div>
  <div style="text-align: center; border-top: 1px solid #f3f4f6; padding-top: 16px; font-size: 11px; color: #9ca3af;">
    <p style="margin: 0;">Powered by Greekstack.</p>
  </div>
</div>
`;
      await sendEmail({
        to: brother.email,
        subject: brotherSubject,
        html: brotherHtml,
        replyTo: replyToEmail,
      }).catch((e) => console.error("Failed to send co-sign email to brother:", e));
    }

    // 2. Email to Parent
    const parentSubject = `Dues Payment Receipt — ${identity.chapterAttribution || identity.chapterFullName}`;
    const parentHtml = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
    <h2 style="color: ${primaryColorHex}; margin: 0; font-family: Georgia, serif;">${identity.chapterFullName}</h2>
    <p style="color: #6b7280; font-size: 11px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">Payment Success</p>
  </div>
  <div style="color: #1f2937; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
    <p>Dear Parent / Co-signer,</p>
    <p>Thank you for completing the dues payment of <strong>$${(payment.amountCents / 100).toFixed(2)}</strong> for <strong>${brother.name}</strong> for the <strong>${payment.year.toUpperCase()}</strong> semester.</p>
    <p>The transaction has processed successfully, and their chapter profile is now updated to reflect active status.</p>
  </div>
  <div style="text-align: center; border-top: 1px solid #f3f4f6; padding-top: 16px; font-size: 11px; color: #9ca3af;">
    <p style="margin: 0;">Sent on behalf of the treasury team. Contact <a href="mailto:${replyToEmail}" style="color: ${primaryColorHex}; text-decoration: none;">${replyToEmail}</a> for invoice questions.</p>
    <p style="margin: 4px 0 0 0;">Powered by Greekstack.</p>
  </div>
</div>
`;
    await sendEmail({
      to: coSignerEmail,
      subject: parentSubject,
      html: parentHtml,
      replyTo: replyToEmail,
    }).catch((e) => console.error("Failed to send co-sign email to parent:", e));
  }

  // Write the audit row with actorName overridden to "stripe-webhook"
  // so the chapter can see at a glance "this is a system-confirmed
  // payment, not a brother / admin action". audit() resolves actor
  // from session cookies — there's no cookie on a Stripe POST, so we
  // bypass with a direct prisma.auditLog.create() here.
  await prisma.auditLog.create({
    data: {
      actorId: null,
      actorName: "stripe-webhook",
      action: "DUES_PAID",
      subjectType: "Brother",
      subjectId: payment.brotherId,
      subjectName: brother?.name || null,
      details: coSignerEmail 
        ? `$${(payment.amountCents / 100).toFixed(2)} via Stripe (Paid by Parent: ${coSignerEmail}) — ${payment.year}`
        : `$${(payment.amountCents / 100).toFixed(2)} via Stripe — ${payment.year}`,
      ipAddress: null,
    },
  }).catch(() => {});
}

async function handleCheckoutFailed(
  session: Stripe.Checkout.Session,
  reason: "expired" | "failed",
  req: Request,
) {
  const payment = await prisma.duesPayment.findUnique({
    where: { stripeSessionId: session.id },
  });
  if (!payment) {
    const donation = await prisma.alumniDonation.findUnique({
      where: { stripeSessionId: session.id },
    });
    if (donation) {
      if (donation.status === "PAID") return;
      await prisma.alumniDonation.update({
        where: { id: donation.id },
        data: { status: "FAILED", notes: `Session ${reason}` },
      });
    }
    return;
  }
  if (payment.status === "PAID") return; // already paid → ignore the noise

  await prisma.duesPayment.update({
    where: { id: payment.id },
    data: { status: "FAILED", notes: `Session ${reason}` },
  });

  const brother = await prisma.brother.findUnique({
    where: { id: payment.brotherId },
    select: { name: true },
  }).catch(() => null);

  await prisma.auditLog.create({
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

async function handlePaymentFailed(pi: Stripe.PaymentIntent, req: Request) {
  // PaymentIntents don't carry our DuesPayment.id, but the session that
  // created the PI does carry it in metadata. We look up by the
  // payment_intent column we wrote on `completed`. For pre-completion
  // failures we may not have it — that's OK, the session.expired event
  // will catch it.
  const payment = await prisma.duesPayment.findFirst({
    where: { stripePaymentIntentId: pi.id },
  });
  if (!payment) {
    const donation = await prisma.alumniDonation.findFirst({
      where: { stripePaymentIntentId: pi.id },
    });
    if (donation) {
      if (donation.status === "PAID") return;
      await prisma.alumniDonation.update({
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

  await prisma.duesPayment.update({
    where: { id: payment.id },
    data: {
      status: "FAILED",
      notes: pi.last_payment_error?.message || "Payment failed",
    },
  });

  const brother = await prisma.brother.findUnique({
    where: { id: payment.brotherId },
    select: { name: true },
  }).catch(() => null);

  await prisma.auditLog.create({
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
  donation: any,
  session: Stripe.Checkout.Session,
) {
  if (donation.status === "PAID") return;

  // SECURITY: confirm the charge actually succeeded + amount matches before
  // crediting the donation (same rationale as dues above).
  if (session.payment_status && session.payment_status !== "paid") {
    console.warn(`[/api/dues/webhook] donation session ${session.id} completed but payment_status=${session.payment_status}; leaving PENDING`);
    return;
  }
  if (
    typeof session.amount_total === "number" &&
    typeof donation.amountCents === "number" &&
    session.amount_total !== donation.amountCents
  ) {
    console.error(`[/api/dues/webhook] donation amount mismatch for session ${session.id}; leaving PENDING`);
    return;
  }

  let paymentIntentId: string | null = null;
  if (session.payment_intent && typeof session.payment_intent === "string") {
    paymentIntentId = session.payment_intent;
  }

  await prisma.alumniDonation.update({
    where: { id: donation.id },
    data: {
      status: "PAID",
      stripePaymentIntentId: paymentIntentId,
      recordedAt: new Date(),
    },
  });

  const alumni = await prisma.alumniProfile.findUnique({
    where: { id: donation.alumniId },
  });

  if (!alumni) return;

  // Resolve chapter identity dynamically for the thank you email
  let identity;
  try {
    identity = await getChapterIdentity();
  } catch {
    identity = {
      fraternityName: "Phi Sigma Kappa",
      schoolShort: "USC",
    };
  }

  // Send thank you email to alumnus
  const html = `
    <div style="font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0a0a0a">
      <h1 style="font-size:22px;margin:0 0 6px">Thank you for your donation!</h1>
      <p style="color:#52525b;margin:0 0 18px">Dear ${alumni.fullName}, we have successfully received your donation of $${(donation.amountCents / 100).toFixed(2)} to the chapter.</p>
      <div style="background:#f4f4f5;padding:16px;border-radius:8px;margin:18px 0;">
        <p style="margin:0 0 8px;"><strong>Campaign:</strong> ${donation.campaign || "General"}</p>
        <p style="margin:0 0 8px;"><strong>Amount:</strong> $${(donation.amountCents / 100).toFixed(2)}</p>
        <p style="margin:0 0 8px;"><strong>Date:</strong> ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}</p>
      </div>
      <p style="color:#52525b;margin:18px 0;">Your contribution directly supports our active brothers, housing operations, and scholarship programs. Thank you for your continued dedication and character.</p>
      <p style="color:#71717a;font-size:12px;margin-top:24px">${identity.fraternityName} Fraternity &middot; ${identity.schoolShort}</p>
    </div>
  `;

  await sendEmail({
    to: alumni.email || "",
    subject: `Thank you for your donation to ${identity.fraternityName}`,
    html,
  }).catch((e) => console.error("Failed to send thank you email:", e));

  // Write audit log
  await prisma.auditLog.create({
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
