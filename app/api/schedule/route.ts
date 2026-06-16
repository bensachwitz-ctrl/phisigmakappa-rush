import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import {
  rateLimit,
  recordRateLimit,
  clientIpFromRequest,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

// Per-IP throttle: this is a PUBLIC, unauthenticated endpoint (a prospect books a
// coffee chat from the marketing site), so it is an abuse target — a bot could
// spray bookings to flood the chapter calendar + the mailer. Same in-memory
// limiter + window the mobile/auth + forgot-password routes use. 10 bookings /
// 10 min / IP is generous for a human, hostile to a script. Recorded on every
// attempt (success or not) so the count reflects real submission pressure.
const BOOKING_LIMIT = { limit: 10, windowMs: 10 * 60 * 1000 };

const BookingSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  eventType: z.string().min(2).max(50),
  date: z.string(),
  notes: z.string().max(2000).optional().default(""),
  location: z.string().max(200).optional().default("Chapter House / Online"),
});

// Resolve the calendar category from the client-supplied eventType string via a
// strict server-side allow-list. This NEVER returns a privileged/internal
// category — only the two PUBLIC values the schema marks as public-facing:
//   "RUSH"  — a rush/recruitment booking (coffee chat, info night, etc.)
//   "OTHER" — neutral fallback for anything not recognized as rush
// Because both outputs are public and the route hard-forces audience="ALL" /
// isPrivate=false separately, this cannot be used to escalate audience or mint a
// private event. Anything that isn't a recognized rush term (e.g. an injected
// "eboard secret meeting") deterministically falls through to "OTHER".
function categoryFromEventType(eventType: string): "RUSH" | "OTHER" {
  const t = eventType.toLowerCase();
  const RUSH_TERMS = ["rush", "recruit", "coffee chat", "info night", "interest", "pnm", "bid"];
  return RUSH_TERMS.some((term) => t.includes(term)) ? "RUSH" : "OTHER";
}

export async function POST(req: Request) {
  try {
    // Throttle BEFORE any parse/DB/email work.
    const rlKey = `schedule:${clientIpFromRequest(req)}`;
    const rl = rateLimit(rlKey, BOOKING_LIMIT);
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "Too many booking requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }
    recordRateLimit(rlKey, BOOKING_LIMIT);

    const body = await req.json().catch(() => ({}));
    const parsed = BookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid booking details" }, { status: 400 });
    }

    const { name, email, eventType, date, notes, location } = parsed.data;
    const startsAt = new Date(date);

    if (isNaN(startsAt.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid date format" }, { status: 400 });
    }

    // Default duration is 30 mins
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

    const cfg = await getSiteConfig();
    const id = chapterIdentityFromCfg(cfg);

    // SECURITY: this is a PUBLIC endpoint — we MUST NOT let an unauthenticated
    // caller pick the audience/visibility. The old code derived category +
    // audience + isPrivate from the client-supplied `eventType` keywords, so a
    // public POST with eventType="eboard meeting" could mint a PRIVATE, EBOARD-
    // scoped event on the chapter calendar (audience escalation + private-event
    // injection).
    //
    // We now hard-FORCE audience + visibility to public server-side and IGNORE
    // any client-implied audience/visibility. The category is derived ONLY via a
    // strict server-side allow-list that can resolve to exactly two PUBLIC,
    // unprivileged values: "RUSH" (a rush/recruitment coffee chat — a public,
    // public-facing category by the schema's own definition) or "OTHER" (the
    // neutral fallback). Privileged/internal categories (EBOARD, BROTHERHOOD,
    // CHAPTER, …) can NEVER be produced here, and audience/isPrivate are never
    // honored from client input — so the escalation vector stays closed while a
    // legitimate "Rush Coffee Chat" booking still lands on the rush calendar.
    const category = categoryFromEventType(eventType);
    const audience = "ALL"; // public booking → visible to all, never EBOARD/private
    const isPrivate = false; // never honor a client-implied private flag

    // Create the event in the DB
    const event = await prisma.event.create({
      data: {
        name: `${eventType}: ${name}`,
        description: `Scheduled by: ${name} (${email})\n\nNotes:\n${notes}`,
        location,
        startsAt,
        endsAt,
        isPrivate,
        category,
        audience,
      },
    });
    
    // Send email to the scheduler
    const htmlToUser = `
      <div style="font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0a0a0a">
        <h1 style="font-size:22px;margin:0 0 6px">Booking Confirmed!</h1>
        <p style="color:#52525b;margin:0 0 18px">Hey ${name}, your event has been scheduled with ${id.fraternityShort} at ${id.schoolShort}.</p>
        <div style="background:#f4f4f5;padding:16px;border-radius:8px;margin:18px 0;">
          <p style="margin:0 0 8px;"><strong>Event:</strong> ${eventType}</p>
          <p style="margin:0 0 8px;"><strong>Date & Time:</strong> ${startsAt.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
          <p style="margin:0 0 8px;"><strong>Location:</strong> ${location}</p>
          ${notes ? `<p style="margin:0;"><strong>Notes:</strong> ${notes}</p>` : ""}
        </div>
        <p style="color:#71717a;font-size:12px;margin-top:24px">${id.tagline} &middot; ${id.fraternityName}</p>
      </div>
    `;
    
    await sendEmail({
      to: email,
      subject: `Confirmed: ${eventType} with ${id.fraternityShort}`,
      html: htmlToUser,
    });
    
    // Send notification to the chapter administrator/contact. White-label-safe:
    // fall back through the chapter's own configured contacts, never a hardcoded
    // tenant address — if none is configured we simply skip the admin alert.
    const adminEmail =
      cfg["contact.rushEmail"] || cfg["contact.advisorEmail"] || cfg["contact.email"] || "";
    const htmlToAdmin = `
      <div style="font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0a0a0a">
        <h1 style="font-size:22px;margin:0 0 6px">New Event Scheduled!</h1>
        <p style="color:#52525b;margin:0 0 18px">A new scheduling booking has been confirmed via the website.</p>
        <div style="background:#f4f4f5;padding:16px;border-radius:8px;margin:18px 0;">
          <p style="margin:0 0 8px;"><strong>Scheduled By:</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p>
          <p style="margin:0 0 8px;"><strong>Event Type:</strong> ${eventType}</p>
          <p style="margin:0 0 8px;"><strong>Date & Time:</strong> ${startsAt.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
          <p style="margin:0 0 8px;"><strong>Location:</strong> ${location}</p>
          ${notes ? `<p style="margin:0;"><strong>Notes:</strong> ${notes}</p>` : ""}
        </div>
        <p style="color:#71717a;font-size:12px;margin-top:24px">This event has been added to the chapter database calendar.</p>
      </div>
    `;
    
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `[Booking Alert] ${eventType} - ${name}`,
        html: htmlToAdmin,
      });
    }

    return NextResponse.json({ ok: true, event });
  } catch (err: any) {
    // Logged server-side for debugging; never echo the raw message (may carry
    // DB/email-provider internals) back to the public caller.
    console.error("Booking error:", err);
    return NextResponse.json(
      { ok: false, error: "We couldn't complete your booking. Please try again." },
      { status: 500 },
    );
  }
}
