// POST /api/contact — the Greekstack APEX "talk to sales" endpoint.
//
// Public, unauthenticated. A prospect (rush chair, chapter president, advisor)
// fills the contact form on /contact and we email the platform OWNER
// (SALES_CONTACT_EMAIL) through the canonical lib/email.ts pipeline so they can
// reply straight from their inbox. No DB write — this is an apex marketing
// surface with no tenant schema.
//
// Hardened exactly like /api/rush: zod validation, a hidden-honeypot field that
// silently 200s on bot traffic, and a per-IP in-memory rate limit.

import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, salesRateLimit, sendSalesEmail, sendProspectConfirmation } from "@/lib/sales-contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ContactSchema = z.object({
  // Require at least two letters so pure-punctuation / encoding-loss junk
  // ("??????") is rejected, matching the /api/rush name guard.
  name: z
    .string()
    .min(2)
    .max(120)
    .refine((s) => (s.match(/\p{L}/gu) || []).length >= 2, {
      message: "Please enter your name.",
    }),
  email: z.string().email().max(160),
  // Chapter/org + school are optional context — a curious prospect may not have
  // a chapter yet (e.g. a colony or an interested advisor).
  org: z.string().max(160).optional().or(z.literal("")),
  school: z.string().max(160).optional().or(z.literal("")),
  message: z.string().min(5).max(4000),
  // Honeypot — hidden offscreen input real users never see. Any value = bot.
  // Field name "website" is the highest-yield trigger per OWASP form-spam data.
  website: z.string().max(500).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (salesRateLimit("contact", ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many messages from this network. Please try again in a little while, or email us directly." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  let parsed: z.infer<typeof ContactSchema>;
  try {
    parsed = ContactSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Please check the form and try again.", issues: err.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: false, error: "Invalid input." }, { status: 400 });
  }

  // Honeypot tripped — return a real-looking success without sending anything,
  // so the bot doesn't rotate IPs to retry. Nothing reaches the owner inbox.
  if (parsed.website && parsed.website.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const name = parsed.name.trim();
  const res = await sendSalesEmail({
    heading: "New contact from your site",
    subject: `Greekstack contact: ${name}`,
    intro: `${name} reached out through the Greekstack contact form.`,
    fields: [
      { label: "Name", value: name },
      { label: "Email", value: parsed.email.trim() },
      { label: "Chapter / org", value: (parsed.org || "").trim() },
      { label: "School", value: (parsed.school || "").trim() },
    ],
    longText: { label: "Message", value: parsed.message.trim() },
    replyTo: parsed.email.trim(),
    footerNote: "Reply directly to this email to respond to the prospect.",
  });

  if (!res.ok) {
    // Surface a soft failure — the prospect can fall back to the mailto on-page.
    return NextResponse.json(
      { ok: false, error: "We couldn't send your message right now. Please email us directly." },
      { status: 502 },
    );
  }

  // Auto-confirm to the prospect too. Best-effort — a confirmation failure must
  // NOT fail the request (the owner notification already went out above).
  try {
    await sendProspectConfirmation({ to: parsed.email.trim(), name, kind: "contact" });
  } catch (e) {
    console.error("[contact] prospect confirmation failed:", e);
  }

  return NextResponse.json({ ok: true });
}
