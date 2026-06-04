import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma, getSubdomain } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";
import { getStripe, getSiteUrl } from "@/lib/stripe";
import { getConnectAccountId, isConnectChargesReady } from "@/lib/stripe-connect";
import { errorSink } from "@/lib/logger";
import { z } from "zod";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/alumni/donate/checkout";

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
    
    // Record the SAME platform fee that the charge will actually take (see the
    // Connect block below). The fee is only charged via application_fee_amount
    // when this chapter has a connected, charges-ready account AND set a
    // positive dues.platformFeePct — otherwise it is $0. Deriving the recorded
    // fee from cfg (not a hardcoded 5%) keeps the donation note honest: it never
    // claims a fee that wasn't charged.
    const feePct = isConnectChargesReady(cfg) ? parseFloat(cfg["dues.platformFeePct"] || "0") : 0;
    const platformFeeCents =
      Number.isFinite(feePct) && feePct > 0 ? Math.round(amountCents * (feePct / 100)) : 0;

    // Create PENDING donation row. Only prefix the fee line when a fee is
    // actually charged; otherwise the note is just the donor's own notes.
    const donation = await prisma.alumniDonation.create({
      data: {
        alumniId,
        amountCents, // This is the total donation amount
        campaign,
        notes: platformFeeCents > 0
          ? `Platform fee: $${(platformFeeCents / 100).toFixed(2)}. ${notes}`
          : notes,
        status: "PENDING",
      },
    });
    
    const siteUrl = getSiteUrl();
    const currency = (cfg["dues.currency"] || "usd").toLowerCase();
    // Chapter subdomain — read from the request Host so the platform's single
    // webhook endpoint (called server-to-server by Stripe with NO subdomain)
    // can route the event back to THIS chapter's schema via metadata.subdomain.
    const sub = getSubdomain(headers().get("host")) || "";

    // Base Checkout params — IDENTICAL to the legacy platform-collects flow.
    // metadata.subdomain MUST stay intact so the single platform webhook can
    // route the event back to this chapter's schema.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: alumni.email || undefined,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountCents,
            product_data: {
              name: `Donation to ${cfg["chapter.fraternityShort"] || cfg["chapter.fraternityName"] || "Your Chapter"} — ${campaign}`,
              description: (() => {
                const greek = cfg["chapter.greekLetters"] || "";
                const schoolShort = cfg["chapter.schoolShort"] || "";
                const who = [greek ? `the ${greek} chapter` : "the chapter", schoolShort ? `at ${schoolShort}` : ""]
                  .filter(Boolean)
                  .join(" ");
                return `Thank you for supporting ${who}.`;
              })(),
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
    };

    // ADDITIVE Stripe Connect routing (Wave-C). ONLY when this chapter has a
    // connected Express account AND Stripe reports charges_enabled do we route
    // the donation to the chapter's account. If the chapter has NOT connected,
    // sessionParams is left unchanged and the platform collects (exact legacy
    // behavior). An optional platform fee comes from dues.platformFeePct only
    // when an admin set a positive value (default: no fee).
    if (isConnectChargesReady(cfg)) {
      const destination = getConnectAccountId(cfg);
      const piData: NonNullable<Stripe.Checkout.SessionCreateParams["payment_intent_data"]> = {
        transfer_data: { destination },
      };
      const feePct = parseFloat(cfg["dues.platformFeePct"] || "0");
      if (Number.isFinite(feePct) && feePct > 0) {
        const fee = Math.round(amountCents * (feePct / 100));
        if (fee > 0) piData.application_fee_amount = fee;
      }
      sessionParams.payment_intent_data = piData;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    
    // Save stripe session ID on the donation record
    await prisma.alumniDonation.update({
      where: { id: donation.id },
      data: { stripeSessionId: session.id },
    });
    
    return NextResponse.json({ ok: true, url: session.url });
  } catch (err: any) {
    errorSink(err, {
      route: ROUTE,
      tenant: getSubdomain(headers().get("host")) || null,
      outcome: "donation_checkout_create_failed",
    });
    return NextResponse.json({ ok: false, error: err?.message || "Payment service error" }, { status: 500 });
  }
}
