// POST /api/contact/call — the "Request a 15-min call" fallback endpoint.
//
// Rendered ONLY when NEXT_PUBLIC_CAL_LINK is NOT set (when it is, the page embeds
// the Cal.com booker instead and this route is simply unused). A prospect leaves
// their name, email, and preferred times; we email the platform OWNER so they can
// reach out and schedule. Same hardening + email pipeline as the other contact
// routes, no DB write.

import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, salesRateLimit, sendSalesEmail, sendProspectConfirmation } from "@/lib/sales-contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CallSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(120)
    .refine((s) => (s.match(/\p{L}/gu) || []).length >= 2, {
      message: "Please enter your name.",
    }),
  email: z.string().email().max(160),
  org: z.string().max(160).optional().or(z.literal("")),
  // Free text — "weekday evenings ET", "Tue/Thu after 3pm", a phone #, etc.
  preferredTimes: z.string().min(3).max(600),
  // Honeypot — see /api/contact.
  website: z.string().max(500).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (salesRateLimit("call", ip)) {
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

  let parsed: z.infer<typeof CallSchema>;
  try {
    parsed = CallSchema.parse(body);
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
    heading: "Call request",
    subject: `Greekstack call request: ${name}`,
    intro: `${name} would like a 15-minute intro call. Reach out to schedule.`,
    fields: [
      { label: "Name", value: name },
      { label: "Email", value: parsed.email.trim() },
      { label: "Chapter / org", value: (parsed.org || "").trim() },
    ],
    longText: { label: "Preferred times", value: parsed.preferredTimes.trim() },
    replyTo: parsed.email.trim(),
    footerNote: "Reply directly to this email to set up the call.",
  });

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "We couldn't send your request right now. Please email us directly." },
      { status: 502 },
    );
  }

  // Auto-confirm to the prospect too. Best-effort — never fail the request.
  try {
    await sendProspectConfirmation({ to: parsed.email.trim(), name, kind: "call" });
  } catch (e) {
    console.error("[contact/call] prospect confirmation failed:", e);
  }

  return NextResponse.json({ ok: true });
}
