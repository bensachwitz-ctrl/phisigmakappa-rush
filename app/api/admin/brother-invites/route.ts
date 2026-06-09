import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, getCurrentBrother, isAdminRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getChapterIdentity, type ChapterIdentity } from "@/lib/chapter-identity";
import { getSiteConfig } from "@/lib/site-config";
import { sendEmail } from "@/lib/email";
import { renderEmail, renderEmailText } from "@/lib/email-template";
import { getTwilioConfig } from "@/lib/messaging-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const InviteSchema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(7).max(40).optional().or(z.literal("")),
  prefillName: z.string().optional(),
  channel: z.enum(["email", "sms", "link"]).default("link"),
});

function baseUrl(req: Request) {
  return process.env.SITE_URL || `${new URL(req.url).origin}`;
}

/** Branded brother-invite email via the chapter's OWN Resend creds (lib/email
 *  resolves per-tenant key + neutral from-address; renderEmail tints the
 *  masthead + CTA with the chapter's brand color, never a hardcoded red). */
async function sendInviteEmail(
  to: string,
  link: string,
  sender: string,
  identity: ChapterIdentity,
  brandHex: string,
) {
  const memberLower = identity.terms.memberLower; // "brother" | "sister" | "member"
  const where = [identity.greekLetters, identity.schoolShort].filter(Boolean).join(", ");
  const html = renderEmail({
    brandHex,
    chapterName: identity.chapterAttribution,
    chapterSubline: identity.schoolName || undefined,
    heading: `You're being added to ${identity.fraternityShort}.`,
    bodyHtml: `<p style="margin:0;">${
      sender ? `${esc(sender)} from the chapter` : "The chapter"
    } invited you to join the ${identity.terms.membersLower} directory${where ? ` at ${esc(where)}` : ""}.</p>`,
    cta: { label: `Complete your ${memberLower} profile`, url: link },
    footerNote: `Or open this URL: ${esc(link)} · Link expires in 30 days.${
      identity.tagline ? ` ${esc(identity.tagline)}` : ""
    }`,
  });
  const text = renderEmailText({
    heading: `You're being added to ${identity.fraternityShort}.`,
    lines: [
      `${sender ? `${sender} from the chapter` : "The chapter"} invited you to join the ${identity.terms.membersLower} directory${where ? ` at ${where}` : ""}.`,
      "Link expires in 30 days.",
    ],
    cta: { label: `Complete your ${memberLower} profile`, url: link },
    chapterName: identity.chapterAttribution,
  });
  const res = await sendEmail({
    to,
    subject: `Welcome to ${identity.fraternityName} — finish your profile`,
    html,
    text,
  });
  return { sent: !!res.ok, reason: res.ok ? "ok" : (res as any).error || "send-failed" };
}

/** Escape caller-supplied plain strings before HTML interpolation. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendSms(to: string, link: string, sender: string, identity: ChapterIdentity) {
  const { accountSid: sid, authToken: token, phoneNumber: from } = await getTwilioConfig();
  if (!sid || !token || !from) return { sent: false, reason: "no-twilio" };
  const msg = `${sender || identity.chapterAttribution}: you're being added as a brother. Finish your profile here: ${link}`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const body = new URLSearchParams({ To: to, From: from, Body: msg });
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { authorization: `Basic ${auth}`, "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return { sent: r.ok, reason: r.ok ? "ok" : `twilio-${r.status}` };
}

export async function GET() {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isAdminRole()) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  const invites = await prisma.brotherInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ ok: true, invites });
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isAdminRole()) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }
  const { email, phone, prefillName, channel } = parsed.data;

  if (channel === "email" && !email) {
    return NextResponse.json({ ok: false, error: "Email is required for email channel" }, { status: 400 });
  }
  if (channel === "sms" && !phone) {
    return NextResponse.json({ ok: false, error: "Phone is required for SMS channel" }, { status: 400 });
  }

  const sender = await getCurrentBrother();
  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const invite = await prisma.brotherInvite.create({
    data: {
      token,
      email: email || null,
      phone: phone || null,
      prefillName: prefillName || null,
      invitedBy: sender?.name || null,
      expiresAt,
    },
  });

  const link = `${baseUrl(req)}/onboard/${token}`;
  const senderName = sender?.name || "";
  // Pull identity + brand color once so both channels share the same chapter
  // signature and the email masthead/CTA render in THIS chapter's brand color.
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const identity = await getChapterIdentity();
  const brandHex = cfg["brand.primaryHex"] || "";

  let delivery: { channel: string; sent: boolean; reason: string } = { channel: "link", sent: false, reason: "manual" };
  if (channel === "email" && email) {
    const r = await sendInviteEmail(email, link, senderName, identity, brandHex);
    delivery = { channel: "email", ...r };
  } else if (channel === "sms" && phone) {
    const r = await sendSms(phone, link, senderName, identity);
    delivery = { channel: "sms", ...r };
  }

  // Audit the issued invite so the e-board can answer "who invited this
  // person, and how?" later. Subject = the recipient (name/email/phone),
  // details = the delivery channel + outcome.
  await audit({
    action: "INVITE_SENT",
    subjectType: "BrotherInvite",
    subjectId: invite.id,
    subjectName: prefillName || email || phone || "(link invite)",
    details: `${delivery.channel} · ${delivery.sent ? "sent" : delivery.reason}`,
    req,
  });

  return NextResponse.json({ ok: true, invite, link, delivery });
}

export async function DELETE(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isAdminRole()) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = body?.id;
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const updated = await prisma.brotherInvite.update({ where: { id }, data: { status: "REVOKED" } });

  // Audit the revocation — a single-use onboarding link is a security-relevant
  // object, so killing one should leave a trail. Subject = the recipient the
  // invite was for (name/email/phone), resolved from the row we just updated.
  await audit({
    action: "INVITE_REVOKED",
    subjectType: "BrotherInvite",
    subjectId: id,
    subjectName: updated.prefillName || updated.email || updated.phone || "(link invite)",
    req,
  });

  return NextResponse.json({ ok: true });
}
