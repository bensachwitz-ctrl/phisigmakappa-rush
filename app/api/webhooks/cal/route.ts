// POST /api/webhooks/cal — Cal.com booking webhook receiver.
//
// Completes the "email BOTH the owner AND the prospect AUTOMATICALLY" loop for
// the booking path: when a prospect books the 30-min event on Cal.com, Cal
// POSTs here and we (1) notify the platform OWNER a call was booked and (2) send
// the ATTENDEE a branded Resend confirmation. Cancellations send the owner a
// brief heads-up.
//
// SETUP (owner action required):
//   1. Set CAL_WEBHOOK_SECRET in the environment (a random string).
//   2. In Cal.com → Settings → Webhooks, add a webhook with the SAME secret
//      pointed at  POST https://<your-domain>/api/webhooks/cal  subscribed to
//      BOOKING_CREATED + BOOKING_CANCELLED.
//
// SECURITY: when CAL_WEBHOOK_SECRET is set we verify Cal's
// `x-cal-signature-256` header == HMAC-SHA256(rawBody, secret) (hex,
// constant-time) and 401 on mismatch — mirroring the fail-closed-in-prod style
// of app/api/sms/inbound. When NO secret is set we accept but log "unverified"
// (Cal allows secret-less webhooks; keeps local/preview testing working).
//
// ALWAYS returns 200 quickly on the happy path — Cal retries any non-2xx, and
// the email side-effects are best-effort, so a send failure must not trigger a
// storm of retries.

import { NextResponse } from "next/server";
import crypto from "crypto";
import { salesContactEmail, calBookingUrl } from "@/lib/sales-contact";
import { sendEmail } from "@/lib/email";
import { renderEmail, renderEmailText, type EmailCta } from "@/lib/email-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Verify Cal.com's `x-cal-signature-256` header.
 *
 * Cal signs the RAW request body as HMAC-SHA256 with the webhook secret and
 * sends the lowercase hex digest. We compare constant-time.
 *
 * Behavior when CAL_WEBHOOK_SECRET is missing (mirrors sms/inbound):
 *   - Returns `true` (accept) regardless of environment, because Cal.com
 *     supports secret-less webhooks and there's no destructive write here —
 *     the worst case of an unverified POST is an extra best-effort email. The
 *     caller logs "unverified" so the gap is visible. (Set the secret to lock
 *     it down.)
 */
function verifyCalSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[webhooks/cal] CAL_WEBHOOK_SECRET not set — accepting unverified");
    return true;
  }
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const sig = signatureHeader.trim().toLowerCase();
  // Constant-time compare; length guard first since timingSafeEqual throws on
  // length mismatch.
  if (expected.length !== sig.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

type CalAttendee = { email?: string; name?: string; timeZone?: string };

/** Format an ISO start time into a friendly, timezone-aware string for the
 *  email body. Falls back to the raw value if it isn't parseable. */
function formatStart(startTime: unknown, timeZone?: string | null): string {
  const raw = typeof startTime === "string" ? startTime : "";
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      ...(timeZone ? { timeZone } : {}),
    }).format(d);
  } catch {
    // Invalid timeZone string — render without it rather than throw.
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  }
}

/** Minimal HTML escape for caller-supplied strings dropped into trusted body
 *  HTML (mirrors lib/sales-contact escHtml). */
function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
  // Read the RAW body first — signature verification must run over the exact
  // bytes Cal signed, before any JSON re-serialization.
  let raw = "";
  try {
    raw = await req.text();
  } catch {
    // Can't read body → nothing to do, but still 200 so Cal doesn't retry.
    return NextResponse.json({ ok: true });
  }

  const signature = req.headers.get("x-cal-signature-256");
  if (!verifyCalSignature(raw, signature)) {
    // Only reachable when a secret IS set and the signature is bad/absent.
    return new NextResponse("Invalid signature", { status: 401 });
  }

  // Defensive parse — a malformed payload must not 500 (Cal would retry).
  let evt: any = {};
  try {
    evt = raw ? JSON.parse(raw) : {};
  } catch {
    console.warn("[webhooks/cal] unparseable JSON body — ignoring");
    return NextResponse.json({ ok: true });
  }

  const triggerEvent: string = String(evt?.triggerEvent || "");
  const payload: any = evt?.payload || {};
  const attendees: CalAttendee[] = Array.isArray(payload?.attendees) ? payload.attendees : [];
  const primary = attendees[0] || {};
  const attendeeEmail = (primary.email || "").trim();
  const attendeeName = (primary.name || "").trim();
  const attendeeFirst = attendeeName.split(/\s+/)[0] || "there";
  const title = (payload?.title || "your call").toString();
  const uid = (payload?.uid || "").toString();
  const when = formatStart(payload?.startTime, primary.timeZone);

  try {
    if (triggerEvent === "BOOKING_CREATED") {
      // ── Owner notice ────────────────────────────────────────────────────
      const ownerBody = `
        <p style="margin:0 0 16px;">A prospect just booked a call through Cal.com.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border:1px solid #eeeef2;border-radius:10px;padding:6px 14px;">
          <tr><td style="padding:7px 0;color:#71717a;white-space:nowrap;">Name</td><td style="padding:7px 0 7px 16px;text-align:right;font-weight:600;color:#0a0a0a;">${esc(attendeeName || "—")}</td></tr>
          <tr><td style="padding:7px 0;color:#71717a;white-space:nowrap;">Email</td><td style="padding:7px 0 7px 16px;text-align:right;font-weight:600;color:#0a0a0a;">${esc(attendeeEmail || "—")}</td></tr>
          <tr><td style="padding:7px 0;color:#71717a;white-space:nowrap;">When</td><td style="padding:7px 0 7px 16px;text-align:right;font-weight:600;color:#0a0a0a;">${esc(when || "—")}</td></tr>
          <tr><td style="padding:7px 0;color:#71717a;white-space:nowrap;">Event</td><td style="padding:7px 0 7px 16px;text-align:right;font-weight:600;color:#0a0a0a;">${esc(title)}</td></tr>
        </table>`;
      const ownerHtml = renderEmail({
        chapterName: "Greekstack — Sales",
        heading: "New call booked",
        bodyHtml: ownerBody,
        footerNote: uid ? `Cal.com booking ref: ${uid}` : null,
      });
      const ownerText = renderEmailText({
        heading: "New call booked",
        lines: [
          "A prospect just booked a call through Cal.com.",
          `Name: ${attendeeName || "—"}`,
          `Email: ${attendeeEmail || "—"}`,
          `When: ${when || "—"}`,
          `Event: ${title}`,
        ],
        chapterName: "Greekstack",
      });
      await sendEmail({
        to: salesContactEmail(),
        subject: `New call booked${attendeeName ? `: ${attendeeName}` : ""}`,
        html: ownerHtml,
        text: ownerText,
        replyTo: attendeeEmail || undefined,
      });

      // ── Attendee confirmation ───────────────────────────────────────────
      if (attendeeEmail) {
        const cta: EmailCta = { label: "Manage your booking", url: calBookingUrl() };
        const attBody = `
          <p style="margin:0 0 14px;">Hi ${esc(attendeeFirst)},</p>
          <p style="margin:0 0 14px;">Your call is booked${when ? ` for <strong>${esc(when)}</strong>` : ""}. You'll get a calendar invite from Cal.com with the meeting link.</p>
          <p style="margin:0 0 14px;">Looking forward to talking through how Greekstack can fit your chapter. If anything comes up beforehand, just reply to this email.</p>`;
        const attHtml = renderEmail({
          chapterName: "Greekstack",
          heading: "Your call is booked",
          bodyHtml: attBody,
          cta,
          footerNote: "Need to reschedule? Use the Cal.com link in your calendar invite.",
        });
        const attText = renderEmailText({
          heading: "Your call is booked",
          lines: [
            `Hi ${attendeeFirst},`,
            `Your call is booked${when ? ` for ${when}` : ""}. You'll get a calendar invite from Cal.com with the meeting link.`,
            "Looking forward to talking through how Greekstack can fit your chapter. If anything comes up beforehand, just reply to this email.",
          ],
          chapterName: "Greekstack",
        });
        await sendEmail({
          to: attendeeEmail,
          subject: "Your Greekstack call is booked",
          html: attHtml,
          text: attText,
          replyTo: salesContactEmail(),
        });
      }
    } else if (triggerEvent === "BOOKING_CANCELLED") {
      // ── Owner heads-up only ─────────────────────────────────────────────
      const body = `
        <p style="margin:0 0 14px;">A booked call was cancelled on Cal.com.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border:1px solid #eeeef2;border-radius:10px;padding:6px 14px;">
          <tr><td style="padding:7px 0;color:#71717a;white-space:nowrap;">Name</td><td style="padding:7px 0 7px 16px;text-align:right;font-weight:600;color:#0a0a0a;">${esc(attendeeName || "—")}</td></tr>
          <tr><td style="padding:7px 0;color:#71717a;white-space:nowrap;">Email</td><td style="padding:7px 0 7px 16px;text-align:right;font-weight:600;color:#0a0a0a;">${esc(attendeeEmail || "—")}</td></tr>
          <tr><td style="padding:7px 0;color:#71717a;white-space:nowrap;">Was</td><td style="padding:7px 0 7px 16px;text-align:right;font-weight:600;color:#0a0a0a;">${esc(when || "—")}</td></tr>
        </table>`;
      const html = renderEmail({
        chapterName: "Greekstack — Sales",
        heading: "Call cancelled",
        bodyHtml: body,
        footerNote: uid ? `Cal.com booking ref: ${uid}` : null,
      });
      const text = renderEmailText({
        heading: "Call cancelled",
        lines: [
          "A booked call was cancelled on Cal.com.",
          `Name: ${attendeeName || "—"}`,
          `Email: ${attendeeEmail || "—"}`,
          `Was: ${when || "—"}`,
        ],
        chapterName: "Greekstack",
      });
      await sendEmail({
        to: salesContactEmail(),
        subject: `Call cancelled${attendeeName ? `: ${attendeeName}` : ""}`,
        html,
        text,
        replyTo: attendeeEmail || undefined,
      });
    } else {
      // Other triggers (rescheduled, meeting-ended, etc.) — acknowledge so Cal
      // doesn't retry, but take no action.
      console.log(`[webhooks/cal] ignoring trigger: ${triggerEvent || "(none)"}`);
    }
  } catch (err: any) {
    // Best-effort: swallow send failures so Cal gets its 200 and doesn't retry.
    console.error("[webhooks/cal] handler error:", err?.message || err);
  }

  return NextResponse.json({ ok: true });
}
