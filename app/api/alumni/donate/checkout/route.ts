import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma, getSubdomain } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";
import { getStripe, getSiteUrl } from "@/lib/stripe";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DonationSchema = z.object({
  alumniId: z.string().min(1),
  amountCents: z.number().min(500), // Min donation $5.00
  campaign: z.string().min(1).max(100).optional().default("General"),
  notes: z.string().max(1000).optional().default(""),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = DonationSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid donation details" }, { status: 400 });
    }
    
    const { alumniId, amountCents, campaign, notes } = parsed.data;
    
    // Fetch alumni profile to verify it exists
    const alumni = await prisma.alumniProfile.findUnique({
      where: { id: alumniId },
    });
    
    if (!alumni) {
      return NextResponse.json({ ok: false, error: "Alumni profile not found" }, { status: 404 });
    }
    
    const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
    const stripe = getStripe();
    
    if (!stripe) {
      return NextResponse.json(
        { ok: false, error: "Donation checkout not configured. Please contact the chapter treasurer." },
        { status: 503 }
      );
    }
    
    // We take a 5% platform fee on all donations
    const platformFeePercent = 0.05;
    const platformFeeCents = Math.round(amountCents * platformFeePercent);
    
    // Create PENDING donation row
    const donation = await prisma.alumniDonation.create({
      data: {
        alumniId,
        amountCents, // This is the total donation amount
        campaign,
        notes: `Platform fee: $${(platformFeeCents / 100).toFixed(2)}. ${notes}`,
        status: "PENDING",
      },
    });
    
    const siteUrl = getSiteUrl();
    const currency = (cfg["dues.currency"] || "usd").toLowerCase();
    // Chapter subdomain — read from the request Host so the platform's single
    // webhook endpoint (called server-to-server by Stripe with NO subdomain)
    // can route the event back to THIS chapter's schema via metadata.subdomain.
    const sub = getSubdomain(headers().get("host")) || "";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: alumni.email || undefined,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountCents,
            product_data: {
              name: `Donation to ${cfg["chapter.fraternityShort"] || "Phi Sigma Kappa"} — ${campaign}`,
              description: `Thank you for supporting the Gamma Triton chapter at ${cfg["chapter.schoolShort"] || "USC"}.`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/portal/alumni/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/portal/alumni/dashboard`,
      metadata: {
        alumniId,
        donationId: donation.id,
        campaign,
        platformFeeCents: platformFeeCents.toString(),
        subdomain: sub,
      },
    });
    
    // Save stripe session ID on the donation record
    await prisma.alumniDonation.update({
      where: { id: donation.id },
      data: { stripeSessionId: session.id },
    });
    
    return NextResponse.json({ ok: true, url: session.url });
  } catch (err: any) {
    console.error("Donation checkout session creation failed:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Payment service error" }, { status: 500 });
  }
}
