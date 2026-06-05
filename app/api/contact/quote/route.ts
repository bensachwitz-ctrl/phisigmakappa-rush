// POST /api/contact/quote — the "Request a customized chapter system" endpoint.
//
// This is Greekstack pricing METHOD 3: a fully custom-built version tailored to
// a chapter. A prospect describes what they want customized + their timeline +
// (optionally) budget, and we email the platform OWNER so they can scope a quote
// and reply. Same hardening as /api/contact (zod + honeypot + per-IP limit),
// same canonical email pipeline, no DB write.

import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, salesRateLimit, sendSalesEmail, sendProspectConfirmation } from "@/lib/sales-contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuoteSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(120)
    .refine((s) => (s.match(/\p{L}/gu) || []).length >= 2, {
      message: "Please enter your name.",
    }),
  email: z.string().email().max(160),
  org: z.string().max(160).optional().or(z.literal("")),
  school: z.string().max(160).optional().or(z.literal("")),
  // Rough chapter size — free text so "~80", "120 active + 300 alumni", etc.
  // all work. Optional; helps the owner ballpark scope.
  memberCount: z.string().max(60).optional().or(z.literal("")),
  // The core ask: what they want custom-built. Required — it's the whole point.
  customization: z.string().min(10).max(4000),
  timeline: z.string().max(200).optional().or(z.literal("")),
  budget: z.string().max(120).optional().or(z.literal("")),
  // Honeypot — see /api/contact.
  website: z.string().max(500).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (salesRateLimit("quote", ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests from this network. Please try again in a little while, or email us directly." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  let parsed: z.infer<typeof QuoteSchema>;
  try {
    parsed = QuoteSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Please check the form and try again.", issues: err.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: false, error: "Invalid input." }, { status: 400 });
  }

  // Honeypot tripped — silent success, nothing sent.
  if (parsed.website && parsed.website.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const name = parsed.name.trim();
  const res = await sendSalesEmail({
    heading: "Custom build — quote request",
    subject: "Custom Greekstack quote request",
    intro: `${name} wants a fully custom-built Greekstack tailored to their chapter. Details below — a custom base fee applies; reply with a scoped quote.`,
    fields: [
      { label: "Name", value: name },
      { label: "Email", value: parsed.email.trim() },
      { label: "Chapter / org", value: (parsed.org || "").trim() },
      { label: "School", value: (parsed.school || "").trim() },
      { label: "Members (approx.)", value: (parsed.memberCount || "").trim() },
      { label: "Timeline", value: (parsed.timeline || "").trim() },
      { label: "Budget", value: (parsed.budget || "").trim() },
    ],
    longText: { label: "What they want customized", value: parsed.customization.trim() },
    replyTo: parsed.email.trim(),
    footerNote: "Reply directly to this email to send the prospect their quote.",
  });

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "We couldn't send your request right now. Please email us directly." },
      { status: 502 },
    );
  }

  // Auto-confirm to the prospect too. Best-effort — never fail the request.
  try {
    await sendProspectConfirmation({ to: parsed.email.trim(), name, kind: "quote" });
  } catch (e) {
    console.error("[contact/quote] prospect confirmation failed:", e);
  }

  return NextResponse.json({ ok: true });
}
