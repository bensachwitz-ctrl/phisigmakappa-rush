// /api/admin/rushees/[id]/bid — send a bid to one PNM.
//
// Flips Rush.status to BID_EXTENDED + generates a single-use bidToken if
// one doesn't already exist (same logic as /api/admin/rush PATCH). The
// /bid/[token] page handles the PNM's accept/decline.
//
// This is a distinct endpoint from /api/admin/rush PATCH so the detail-page
// "Send bid" button can be a single-purpose POST — no embedded
// status-machine logic on the client. Re-issuing a bid (after a decline)
// is supported via the `regenerate` flag.
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole, isSameOrigin } from "@/lib/auth";
import { actorFromRequest, auditAndNotify } from "@/lib/notify";
import { getChapterIdentity, type ChapterIdentity } from "@/lib/chapter-identity";
import { getResendConfig, getTwilioConfig } from "@/lib/messaging-config";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BID_TOKEN_TTL_DAYS = 14;

const Schema = z.object({
  regenerate: z.boolean().optional(),
});

/** Synthetic placeholder addresses (PNMs who registered without an email get a
 *  `<name>-<ts>@noemail.local` row) must never be emailed. */
function isRealEmail(email: string | null | undefined): email is string {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (!e || e.endsWith("@noemail.local")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function normalizePhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return p.startsWith("+") ? p : `+${d}`;
}

/** Best-effort bid-link email via the chapter's own Resend creds. Returns
 *  `false` (never throws) when unconfigured or on any send failure. */
async function sendBidEmail(
  to: string,
  link: string,
  firstName: string,
  identity: ChapterIdentity,
): Promise<boolean> {
  try {
    const { apiKey, fromEmail } = await getResendConfig();
    if (!apiKey) return false; // chapter hasn't configured Resend → mock/skip
    const from = `${identity.chapterAttribution || identity.fraternityName} <${fromEmail}>`;
    const org = identity.chapterFullName || identity.fraternityName || "the chapter";
    const html = `
      <div style="font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0a0a0a">
        <h1 style="font-size:22px;margin:0 0 6px">You've received a bid from ${org}.</h1>
        <p style="color:#52525b;margin:0 0 18px">${firstName ? `${firstName}, congratulations` : "Congratulations"} — ${org} has extended you a bid. Tap below to accept or decline.</p>
        <p style="margin:18px 0">
          <a href="${link}" style="display:inline-block;background:#a3001a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">View your bid</a>
        </p>
        <p style="color:#71717a;font-size:12px;margin-top:24px">Or open this URL: ${link}</p>
        <p style="color:#71717a;font-size:12px">This link expires in ${BID_TOKEN_TTL_DAYS} days.</p>
      </div>`;
    const resend = new Resend(apiKey);
    const res = await resend.emails.send({
      from,
      to,
      subject: `You've received a bid from ${identity.fraternityName || "the chapter"}`,
      html,
      text: `${org} has extended you a bid. Accept or decline here: ${link} (expires in ${BID_TOKEN_TTL_DAYS} days).`,
    });
    if (res && typeof res === "object" && "error" in res && (res as any).error) return false;
    return true;
  } catch {
    return false;
  }
}

/** Best-effort bid-link SMS via the chapter's own Twilio creds. Returns `false`
 *  (never throws) when unconfigured or on any send failure. */
async function sendBidSms(
  to: string,
  link: string,
  identity: ChapterIdentity,
): Promise<boolean> {
  try {
    const twilio = await getTwilioConfig();
    if (!twilio.accountSid || !twilio.authToken || !twilio.phoneNumber) return false;
    const who = identity.chapterAttribution || identity.fraternityName || "The chapter";
    const msg = `${who}: you've received a bid! Accept or decline here: ${link}`;
    const auth = Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString("base64");
    const body = new URLSearchParams({ From: twilio.phoneNumber, To: normalizePhone(to), Body: msg });
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Origin not allowed" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body || {});
  const regenerate = parsed.success ? !!parsed.data.regenerate : false;

  const before = await prisma.rush.findUnique({
    where: { id: params.id },
    select: { name: true, status: true, bidToken: true, email: true, phone: true },
  });
  if (!before) {
    return NextResponse.json({ ok: false, error: "PNM not found" }, { status: 404 });
  }

  const needsNewToken = !before.bidToken || regenerate;
  const newTokenFields = needsNewToken
    ? {
        bidToken: crypto.randomBytes(16).toString("hex"),
        bidTokenExpiresAt: new Date(Date.now() + BID_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
        // Clear any stale response — a re-issue is a fresh decision window.
        bidRespondedAt: null,
        bidResponseChoice: null,
      }
    : {};

  try {
    const updated = await prisma.rush.update({
      where: { id: params.id },
      data: {
        status: "BID_EXTENDED",
        ...newTokenFields,
      },
    });
    // Deliver the bid link to the PNM — BEST-EFFORT. The schema comment
    // promises the bid is emailed + texted; previously this route only
    // persisted the token and relied on copy-to-clipboard. We now also send
    // via the chapter's OWN Resend + Twilio (per-tenant creds, env fallback).
    // Sending NEVER fails the bid: a send error/unconfigured channel just
    // reports sent:false so the UI falls back to "copy link". The bid URL is
    // the current origin + /bid/<token>.
    const origin = process.env.SITE_URL || new URL(req.url).origin;
    const link = updated.bidToken ? `${origin}/bid/${updated.bidToken}` : null;
    const firstName = (updated.name || "").split(/\s+/)[0] || "";
    let sentEmail = false;
    let sentSms = false;
    if (link) {
      const identity = await getChapterIdentity().catch(() => null);
      if (identity) {
        if (isRealEmail(before.email)) {
          sentEmail = await sendBidEmail(before.email, link, firstName, identity);
        }
        if (before.phone && before.phone.replace(/\D/g, "").length >= 10) {
          sentSms = await sendBidSms(before.phone, link, identity);
        }
      }
    }

    await auditAndNotify("rushee.bid.send", {
      actor: actorFromRequest(req, { role: "admin", name: "admin (shared)" }),
      entity: { type: "Rush", id: updated.id, name: updated.name },
      payload: {
        before: { status: before.status, hadToken: !!before.bidToken },
        after: { status: "BID_EXTENDED", regenerated: needsNewToken },
        sent: { email: sentEmail, sms: sentSms },
      },
      details: needsNewToken ? "new bid token issued" : "re-sent existing token",
    });
    return NextResponse.json({
      ok: true,
      rush: {
        ...updated,
        bidTokenExpiresAt: updated.bidTokenExpiresAt ? updated.bidTokenExpiresAt.toISOString() : null,
      },
      sent: { email: sentEmail, sms: sentSms },
    });
  } catch (err) {
    console.error("[/api/admin/rushees/[id]/bid POST]", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
