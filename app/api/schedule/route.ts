import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";

export const runtime = "nodejs";

const BookingSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  eventType: z.string().min(2).max(50),
  date: z.string(),
  notes: z.string().max(2000).optional().default(""),
  location: z.string().max(200).optional().default("Chapter House / Online"),
});

export async function POST(req: Request) {
  try {
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
    
    // Determine category and audience
    let category = "OTHER";
    let audience = "ALL";
    let isPrivate = false;
    
    if (eventType.toLowerCase().includes("rush")) {
      category = "RUSH";
      audience = "ALL";
    } else if (eventType.toLowerCase().includes("brotherhood")) {
      category = "BROTHERHOOD";
      audience = "BROTHERS";
      isPrivate = true;
    } else if (eventType.toLowerCase().includes("chapter") || eventType.toLowerCase().includes("eboard")) {
      category = "CHAPTER";
      audience = "EBOARD";
      isPrivate = true;
    } else if (eventType.toLowerCase().includes("social")) {
      category = "SOCIAL";
      audience = "BROTHERS";
    }
    
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
