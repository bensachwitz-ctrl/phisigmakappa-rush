import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBrother } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { getStripe, getSiteUrl, applyPassThrough } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
import { getChapterIdentity } from "@/lib/chapter-identity";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/dues/co-sign
 *
 * Generates a Stripe Checkout session for a parent/co-signer to pay a brother's dues
 * and emails them a premium invoice link directly.
 */
const coSignAttempts = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 5;

function checkRateLimit(brotherId: string): boolean {
  const now = Date.now();
  const prior = coSignAttempts.get(brotherId) || [];
  const recent = prior.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  coSignAttempts.set(brotherId, recent);
  return true;
}

export async function POST(req: Request) {
  const brother = await getCurrentBrother();
  if (!brother) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  // Rate-limit to prevent spam
  if (!checkRateLimit(brother.id)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const { parentEmail } = body;
  if (!parentEmail || typeof parentEmail !== "string" || !parentEmail.includes("@")) {
    return NextResponse.json({ ok: false, error: "A valid parent email is required" }, { status: 400 });
  }

  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const enabled = cfg["dues.enabled"] === "true";
  const publishableKey = cfg["dues.stripePublishableKey"] || "";
  const webhookSecret = cfg["dues.stripeWebhookSecret"] || "";
  const billingPlan = cfg["chapter.billingPlan"] || "dues_split";

  // Check if billing plan is flat subscription
  if (billingPlan === "flat_subscription") {
    return NextResponse.json(
      {
        ok: false,
        error: "This chapter is on a manual billing plan and online dues payment is disabled.",
      },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  if (!enabled || !publishableKey || !webhookSecret || !stripe) {
    return NextResponse.json(
      {
        ok: false,
        error: "Online dues collection is not configured by the chapter administration.",
      },
      { status: 503 },
    );
  }

  const year = cfg["dues.year"] || "2026-fall";
  const baseAmount = parseInt(cfg["dues.amountCents"] || "15000", 10) || 15000;
  const currency = (cfg["dues.currency"] || "usd").toLowerCase();
  const passThrough = cfg["dues.passThroughFee"] === "true";
  const totalCents = passThrough ? applyPassThrough(baseAmount) : baseAmount;
  const label = cfg["dues.label"] || "Chapter dues";

  // Check if already paid
  const existing = await prisma.duesPayment.findFirst({
    where: { brotherId: brother.id, year, status: "PAID" },
  }).catch(() => null);
  if (existing) {
    return NextResponse.json(
      { ok: false, error: `You have already paid your dues for ${year}.` },
      { status: 409 },
    );
  }

  // Create PENDING DuesPayment row
  let payment;
  try {
    payment = await prisma.duesPayment.create({
      data: {
        brotherId: brother.id,
        amountCents: totalCents,
        currency,
        year,
        method: "STRIPE",
        status: "PENDING",
        notes: `Co-signer Invoice sent to: ${parentEmail}`,
      },
    });
  } catch (err) {
    console.error("[/api/dues/co-sign] DuesPayment creation failed:", err);
    return NextResponse.json(
      { ok: false, error: "Could not initialize billing row in database." },
      { status: 500 },
    );
  }

  // Create Stripe session
  const siteUrl = getSiteUrl();
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: parentEmail,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: totalCents,
            product_data: {
              name: `${label} — Co-signer/Parent Invoice`,
              description: `Dues payment for ${brother.name} (${year})`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/admin/dues/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/portal/brothers`,
      metadata: {
        brotherId: brother.id,
        duesPaymentId: payment.id,
        duesYear: year,
        coSignerEmail: parentEmail,
      },
    });
  } catch (err: any) {
    console.error("[/api/dues/co-sign] Stripe creation failed:", err);
    await prisma.duesPayment.update({
      where: { id: payment.id },
      data: { status: "FAILED", notes: `Stripe error during co-sign creation: ${err?.message || "unknown"}` },
    }).catch(() => {});
    return NextResponse.json(
      { ok: false, error: "Payment gateway connection failed. Try again later." },
      { status: 502 },
    );
  }

  // Update session ID
  await prisma.duesPayment.update({
    where: { id: payment.id },
    data: { stripeSessionId: session.id },
  }).catch(() => {});

  // Send the premium HTML email
  let identity;
  try {
    identity = await getChapterIdentity();
  } catch {
    identity = {
      chapterFullName: "Phi Sigma Kappa Gamma Triton",
      chapterAttribution: "Phi Sig USC",
      fraternityName: "Phi Sigma Kappa",
      schoolShort: "USC",
      schoolName: "University of South Carolina",
      greekLettersGlyphs: "ΓΤ",
    };
  }

  const primaryColorHex = cfg["brand.primaryHex"] || "#C8102E";
  const replyToEmail = cfg["contact.rushEmail"] || "rush@yourchapter.com";

  const emailSubject = `Dues Payment Invoice for ${brother.name} — ${identity.chapterAttribution || identity.chapterFullName}`;

  const emailHtml = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
  <!-- Header -->
  <div style="text-align: center; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid #f3f4f6;">
    <h2 style="color: ${primaryColorHex}; margin: 0; font-size: 22px; font-weight: 800; font-family: 'Georgia', Georgia, serif; tracking-tight: -0.02em;">
      ${identity.chapterFullName}
    </h2>
    <p style="color: #6b7280; font-size: 11px; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700;">
      Parent / Co-signer Invoice
    </p>
  </div>
  
  <!-- Body Content -->
  <div style="color: #1f2937; font-size: 15px; line-height: 1.6; margin-bottom: 28px;">
    <p>Dear Parent / Co-signer,</p>
    <p>
      Your son, <strong style="color: #111827;">${brother.name}</strong>, has requested that you co-sign or complete payment for their semester dues for the 
      <strong>${identity.greekLettersGlyphs || "active"}</strong> chapter of <strong>${identity.fraternityName}</strong> at <strong>${identity.schoolName}</strong>.
    </p>
    
    <!-- Invoice Box -->
    <div style="background-color: #fafafa; border: 1px solid #e5e7eb; border-radius: 12px; padding: 22px; margin: 24px 0; text-align: center;">
      <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #8c8c8c; display: block; margin-bottom: 6px; letter-spacing: 0.05em;">
        Dues Amount
      </span>
      <span style="font-size: 34px; font-weight: 900; color: #111827; display: block; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
        $${(totalCents / 100).toFixed(2)}
      </span>
      <span style="font-size: 12px; color: #6b7280; display: block; margin-top: 6px;">
        Academic Term: <strong style="color: #374151;">${year.toUpperCase()}</strong>
      </span>
    </div>
    
    <p>
      Click the secure button below to pay these dues directly via credit card on Stripe. All transactions are fully encrypted, and no financial details are ever shared or stored.
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${session.url}" style="background-color: ${primaryColorHex}; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 14px; font-weight: 750; border-radius: 10px; display: inline-block; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08); transition: background-color 0.15s ease;">
        Pay Dues via Stripe
      </a>
    </div>
    
    <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
      Semester dues enable chapter operations, facility maintenance, leadership development, local philanthropy projects, and insurance. Thank you for your support.
    </p>
  </div>
  
  <!-- Footer -->
  <div style="text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px; font-size: 11px; color: #9ca3af; line-height: 1.4;">
    <p style="margin: 0;">
      This invoice was initiated by the brother. For inquiries, reply directly to this email or contact the treasury team at 
      <a href="mailto:${replyToEmail}" style="color: ${primaryColorHex}; text-decoration: none; font-weight: 600;">${replyToEmail}</a>.
    </p>
    <p style="margin: 6px 0 0 0; font-size: 10px; color: #d1d5db;">
      Powered by Greekstack &copy; 2026. All rights reserved.
    </p>
  </div>
</div>
`;

  const emailRes = await sendEmail({
    to: parentEmail,
    subject: emailSubject,
    html: emailHtml,
    replyTo: replyToEmail,
  });

  if (!emailRes.ok) {
    console.error("[/api/dues/co-sign] sendEmail failed:", emailRes.error);
    return NextResponse.json(
      { ok: false, error: "Invoice generated successfully but email delivery failed." },
      { status: 500 },
    );
  }

  // Audit
  await audit({
    action: "DUES_CO_SIGN_INVOICE_SENT",
    subjectType: "Brother",
    subjectId: brother.id,
    subjectName: brother.name,
    details: `Sent $${(totalCents / 100).toFixed(2)} checkout link to parent: ${parentEmail} for ${year}`,
    req,
  });

  return NextResponse.json({ ok: true });
}
