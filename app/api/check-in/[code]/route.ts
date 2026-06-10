// /api/check-in/[code] — PUBLIC rush-event check-in (rush-cycle feature 2).
//
// A PNM scans the QR at the door of a rush event → lands on /check-in/{code} →
// either (a) an existing PNM checks in by phone, or (b) a brand-new person fills
// a short form. Either way we:
//   1. Resolve the Event by its checkInCode.
//   2. Normalize the phone to E.164 and match an existing Rush (PNM) by phone.
//   3. For a NEW person, create the Rush record so they drop straight into the
//      recruitment pipeline (the Kanban / /admin/rushees list) — and record a
//      TCPA consent receipt because they're opting into rush contact.
//   4. Upsert one EventCheckIn row (idempotent per (eventId, phone)) so a
//      re-scan never double-counts, linked to the Rush record.
//
// PUBLIC + unauthenticated by design (a PNM has no account). It is therefore
// rate-limited per IP and validates input strictly. Returns a friendly result
// the public page renders ("You're checked in" / "Welcome — you're on the list").
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/sms";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same legal disclosure structure version the /api/rush onboard uses. A check-in
// where someone hands over their phone for rush contact is an opt-in, so we keep
// a timestamped receipt for the 4-year TCPA recordkeeping window.
const DISCLOSURE_VERSION = "2026-05-05";

function buildDisclosure(cfg: Record<string, string>): string {
  const id = chapterIdentityFromCfg(cfg);
  const org =
    [id.chapterFullName, id.schoolShort ? `(${id.schoolShort})` : ""]
      .filter(Boolean)
      .join(" ")
      .trim() || "this chapter";
  return (
    "I am 18+ — or I am 17 and have a parent or legal guardian's permission to sign up. " +
    `I agree to receive recurring marketing and informational text and email recruitment/rush messages from ${org} ` +
    "sent using an automatic telephone dialing system or other automated technology. " +
    "Msg frequency varies (up to about 8 msgs per rush cycle). Msg & data rates may apply. " +
    "Reply HELP for help, STOP to opt out at any time. " +
    "Consent to receive these messages is not a condition of any membership consideration. " +
    "My information will only be used to communicate about recruitment/rush and is never sold or shared."
  );
}

const CheckInSchema = z.object({
  // Existing-PNM path needs only a phone; new-person path needs name + email too.
  name: z.string().max(160).optional().or(z.literal("")),
  email: z.string().email().max(200).optional().or(z.literal("")),
  phone: z.string().min(7).max(40),
  major: z.string().max(120).optional().or(z.literal("")),
  year: z.string().max(40).optional().or(z.literal("")),
  hometown: z.string().max(160).optional().or(z.literal("")),
  // Present only on the new-person path; the public page checks the box.
  consent: z.boolean().optional().default(false),
});

function clientIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const code = (params.code || "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing check-in code." }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { checkInCode: code } });
  if (!event) {
    return NextResponse.json(
      { ok: false, error: "This check-in link is no longer active." },
      { status: 404 },
    );
  }

  // Lightweight abuse guard: cap check-in writes per IP per hour using the
  // existing RushSubmitLog (shared rate-limit ledger).
  const ip = clientIp(req);
  if (ip) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.rushSubmitLog
      .count({ where: { ipAddress: ip, createdAt: { gte: hourAgo }, status: "CHECKIN" } })
      .catch(() => 0);
    if (recent > 40) {
      return NextResponse.json(
        { ok: false, error: "Too many check-ins from this device. Try again shortly." },
        { status: 429, headers: { "Retry-After": "1800" } },
      );
    }
  }

  let parsed: z.infer<typeof CheckInSchema>;
  try {
    parsed = CheckInSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Please check the form and try again." }, { status: 400 });
  }

  const phone = normalizePhone(parsed.phone);
  if (!/^\+\d{10,15}$/.test(phone)) {
    return NextResponse.json({ ok: false, error: "Enter a valid phone number." }, { status: 400 });
  }

  // Is this an already-known PNM? Match on normalized phone.
  let rush = await prisma.rush.findFirst({ where: { phone } });
  let isNewPnm = false;

  if (!rush) {
    // NEW person → require the full form + an affirmative consent box, then
    // create the Rush record so they land in the pipeline.
    if (!parsed.name || parsed.name.trim().length < 2) {
      return NextResponse.json(
        { ok: false, error: "We don't recognize that number yet — add your name to check in.", needsForm: true },
        { status: 422 },
      );
    }
    if (!parsed.email) {
      return NextResponse.json(
        { ok: false, error: "Add your email so the chapter can reach you.", needsForm: true },
        { status: 422 },
      );
    }
    if (!parsed.consent) {
      return NextResponse.json(
        { ok: false, error: "Please agree to receive recruitment messages to check in.", needsForm: true },
        { status: 422 },
      );
    }

    // Upsert by email so a second check-in with the same email updates rather
    // than 500ing on the unique-email index.
    rush = await prisma.rush.upsert({
      where: { email: parsed.email },
      update: {
        name: parsed.name.trim(),
        phone,
        major: parsed.major || null,
        year: parsed.year || null,
        hometown: parsed.hometown || null,
      },
      create: {
        name: parsed.name.trim(),
        email: parsed.email,
        phone,
        major: parsed.major || null,
        year: parsed.year || null,
        hometown: parsed.hometown || null,
        notes: `Checked in at "${event.name}" via QR`,
      },
    });
    isNewPnm = true;

    // TCPA consent receipt for the new opt-in.
    const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
    await prisma.rushConsent
      .create({
        data: {
          rushId: rush.id,
          disclosureVersion: DISCLOSURE_VERSION,
          disclosureText: buildDisclosure(cfg),
          ipAddress: ip,
          userAgent: req.headers.get("user-agent") || null,
          ageAttestation: "ADULT_18_PLUS",
        },
      })
      .catch(() => null);
  }

  // Upsert the check-in row (idempotent per event+phone). A re-scan just bumps
  // the timestamp instead of erroring on the unique constraint.
  await prisma.eventCheckIn.upsert({
    where: { eventId_phone: { eventId: event.id, phone } },
    update: { name: rush.name, rushId: rush.id },
    create: { eventId: event.id, name: rush.name, phone, rushId: rush.id },
  });

  if (ip) {
    await prisma.rushSubmitLog
      .create({ data: { ipAddress: ip, email: rush.email, status: "CHECKIN" } })
      .catch(() => null);
  }

  return NextResponse.json({
    ok: true,
    isNewPnm,
    name: rush.name,
    eventName: event.name,
  });
}
