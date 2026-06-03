import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";
import { getStripe, getSiteUrl, applyPassThrough } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
import { getChapterIdentity } from "@/lib/chapter-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/dues-reminders
 *
 * Background cron endpoint to send automated weekly reminders to co-signers
 * with pending dues invoices.
 */
export async function GET(req: Request) {
  // Verify Cron Secret in Production
  const authHeader = req.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const enabled = cfg["dues.enabled"] === "true";
  const publishableKey = cfg["dues.stripePublishableKey"] || "";
  const webhookSecret = cfg["dues.stripeWebhookSecret"] || "";
  const billingPlan = cfg["chapter.billingPlan"] || "dues_split";
  const duesYear = cfg["dues.year"] || "2026-fall";
  const baseAmount = parseInt(cfg["dues.amountCents"] || "15000", 10) || 15000;
  const currency = (cfg["dues.currency"] || "usd").toLowerCase();
  const passThrough = cfg["dues.passThroughFee"] === "true";
  const totalCents = passThrough ? applyPassThrough(baseAmount) : baseAmount;
  const label = cfg["dues.label"] || "Chapter dues";

  // Check if dues split is enabled
  if (billingPlan !== "dues_split" || !enabled || !publishableKey || !webhookSecret) {
    return NextResponse.json({
      ok: true,
      message: "Online dues split collections not active. Skipping cron reminders.",
    });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({
      ok: false,
      error: "Stripe client not available.",
    }, { status: 500 });
  }

  // Find all PENDING payments with parent co-signer emails older than 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pendingPayments = await prisma.duesPayment.findMany({
    where: {
      status: "PENDING",
      year: duesYear,
      method: "STRIPE",
      createdAt: { lt: oneDayAgo },
      notes: { startsWith: "Co-signer Invoice sent to:" },
    },
    include: {
      brother: {
        select: { name: true, email: true },
      },
    },
  });

  if (pendingPayments.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No outstanding reminders found." });
  }

  let sentCount = 0;
  const siteUrl = getSiteUrl();
  let identity;
  try {
    identity = await getChapterIdentity();
  } catch {
    identity = {
      chapterFullName: "Phi Sigma Kappa Gamma Triton",
      chapterAttribution: "Phi Sig USC",
      fraternityName: "Phi Sigma Kappa",
      schoolName: "University of South Carolina",
    };
  }

  const primaryColorHex = cfg["brand.primaryHex"] || "#C8102E";
  const replyToEmail = cfg["contact.rushEmail"] || "rush@yourchapter.com";

  for (const p of pendingPayments) {
    try {
      // Parse email from notes (format: "Co-signer Invoice sent to: parent@email.com")
      const rawEmail = p.notes?.replace("Co-signer Invoice sent to:", "").trim();
      if (!rawEmail || !rawEmail.includes("@")) continue;

      // 1. Generate a NEW Stripe checkout session (since the old link is likely expired)
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: rawEmail,
        line_items: [
          {
            price_data: {
              currency,
              unit_amount: totalCents,
              product_data: {
                name: `${label} — Co-signer/Parent Invoice (Reminder)`,
                description: `Dues payment for ${p.brother.name} (${duesYear})`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${siteUrl}/admin/dues/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/portal/brothers`,
        metadata: {
          brotherId: p.brotherId,
          duesPaymentId: p.id,
          duesYear,
          coSignerEmail: rawEmail,
          isReminder: "true",
        },
      });

      // 2. Update the stripeSessionId in DB with the new session
      await prisma.duesPayment.update({
        where: { id: p.id },
        data: { stripeSessionId: session.id },
      });

      // 3. Send email reminder
      const emailSubject = `Reminder: Dues Payment Invoice for ${p.brother.name} — ${identity.chapterAttribution || identity.chapterFullName}`;

      const emailHtml = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
  <!-- Header -->
  <div style="text-align: center; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid #f3f4f6;">
    <h2 style="color: ${primaryColorHex}; margin: 0; font-size: 22px; font-weight: 800; font-family: 'Georgia', Georgia, serif; tracking-tight: -0.02em;">
      ${identity.chapterFullName}
    </h2>
    <p style="color: #ea580c; font-size: 11px; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700;">
      Outstanding Dues Invoice Reminder
    </p>
  </div>
  
  <!-- Body Content -->
  <div style="color: #1f2937; font-size: 15px; line-height: 1.6; margin-bottom: 28px;">
    <p>Dear Parent / Co-signer,</p>
    <p>
      This is a friendly reminder that the dues invoice initiated by <strong style="color: #111827;">${p.brother.name}</strong> for the 
      <strong>${duesYear.toUpperCase()}</strong> semester is currently outstanding.
    </p>
    
    <!-- Invoice Box -->
    <div style="background-color: #fafafa; border: 1px solid #e5e7eb; border-radius: 12px; padding: 22px; margin: 24px 0; text-align: center;">
      <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #8c8c8c; display: block; margin-bottom: 6px; letter-spacing: 0.05em;">
        Dues Amount Outstanding
      </span>
      <span style="font-size: 34px; font-weight: 900; color: #111827; display: block; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
        $${(totalCents / 100).toFixed(2)}
      </span>
      <span style="font-size: 12px; color: #6b7280; display: block; margin-top: 6px;">
        Academic Term: <strong style="color: #374151;">${duesYear.toUpperCase()}</strong>
      </span>
    </div>
    
    <p>
      Please click the button below to complete this dues transaction securely via credit card on Stripe. 
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${session.url}" style="background-color: ${primaryColorHex}; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 14px; font-weight: 750; border-radius: 10px; display: inline-block; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08); transition: background-color 0.15s ease;">
        Pay Dues via Stripe
      </a>
    </div>
    
    <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
      Dues are required to maintain active roster membership and cover chapter operations. Thank you for your prompt attention to this invoice.
    </p>
  </div>
  
  <!-- Footer -->
  <div style="text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px; font-size: 11px; color: #9ca3af; line-height: 1.4;">
    <p style="margin: 0;">
      For questions, reply directly to this email or contact the treasury team at 
      <a href="mailto:${replyToEmail}" style="color: ${primaryColorHex}; text-decoration: none; font-weight: 600;">${replyToEmail}</a>.
    </p>
    <p style="margin: 6px 0 0 0; font-size: 10px; color: #d1d5db;">
      Powered by Greekstack &copy; 2026. All rights reserved.
    </p>
  </div>
</div>
`;

      await sendEmail({
        to: rawEmail,
        subject: emailSubject,
        html: emailHtml,
        replyTo: replyToEmail,
      });

      // Write audit log
      await prisma.auditLog.create({
        data: {
          actorId: null,
          actorName: "cron-job",
          action: "DUES_CO_SIGN_REMINDER_SENT",
          subjectType: "Brother",
          subjectId: p.brotherId,
          subjectName: p.brother.name,
          details: `Sent weekly payment reminder for $${(totalCents / 100).toFixed(2)} to parent: ${rawEmail} (${duesYear})`,
          ipAddress: null,
        },
      });

      sentCount++;
    } catch (err) {
      console.error(`[dues-reminders cron] failed for payment ${p.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, sent: sentCount });
}
