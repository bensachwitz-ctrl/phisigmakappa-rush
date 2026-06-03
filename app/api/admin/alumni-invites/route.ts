import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, getCurrentBrother, isAdminRole } from "@/lib/auth";
import { getChapterIdentity, type ChapterIdentity } from "@/lib/chapter-identity";
import { getSiteConfig } from "@/lib/site-config";
import { auditAndNotify, actorFromRequest } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// R45 — Alumni portal onboarding invites.
//
// The alumni-relations officer generates a single-use, 30-day link and
// sends it by email / SMS / copy-link. The link drops the alum on
// /alumni/onboard/<token>, where they set a password + confirm consent.
// If `alumniId` is supplied the invite binds to an existing AlumniProfile
// (e.g. one imported from an HQ CSV) so the form pre-fills and the new
// PortalUser attaches to that exact profile — no duplicate row.
//
// Security: token = 24 random bytes (base64url), carries NO PII; expiry
// 30d; single-use (status flips COMPLETED on redeem). Admin-only (session
// + role gate, same as brother-invites). Revoke flips status → REVOKED.

const InviteSchema = z.object({
  alumniId: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(7).max(40).optional().or(z.literal("")),
  prefillName: z.string().max(120).optional(),
  channel: z.enum(["email", "sms", "link"]).default("link"),
});

function baseUrl(req: Request) {
  return process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || `${new URL(req.url).origin}`;
}

async function sendEmail(to: string, link: string, sender: string, identity: ChapterIdentity, domain: string, primaryColor: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("re_xxxxx")) return { sent: false, reason: "no-resend" };
  const from = process.env.RESEND_FROM || `${identity.chapterAttribution} <onboarding@${domain}>`;
  const html = `
    <div style="font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0a0a0a">
      <h1 style="font-size:22px;margin:0 0 6px">Welcome back to ${identity.fraternityShort}.</h1>
      <p style="color:#52525b;margin:0 0 18px">${sender ? `${sender} from the chapter` : "The chapter"} invited you to the ${identity.greekLetters} alumni portal at ${identity.schoolShort} — see brothers, vote in alumni polls, RSVP to events, and support the chapter.</p>
      <p style="margin:18px 0">
        <a href="${link}" style="display:inline-block;background:${primaryColor};color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">Create your alumni account</a>
      </p>
      <p style="color:#71717a;font-size:12px;margin-top:24px">Or open this URL: ${link}</p>
      <p style="color:#71717a;font-size:12px">This link is for you only and expires in 30 days. ${identity.tagline || ""}</p>
    </div>`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to, subject: `${identity.fraternityName} — create your alumni account`, html }),
    });
    return { sent: r.ok, reason: r.ok ? "ok" : `resend-${r.status}` };
  } catch (err: any) {
    return { sent: false, reason: `resend-error:${err?.message || "unknown"}` };
  }
}

async function sendSms(to: string, link: string, sender: string, identity: ChapterIdentity) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return { sent: false, reason: "no-twilio" };
  const msg = `${sender || identity.chapterAttribution}: create your ${identity.fraternityShort} alumni portal account here (expires in 30 days): ${link}`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const body = new URLSearchParams({ To: to, From: from, Body: msg });
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { authorization: `Basic ${auth}`, "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    return { sent: r.ok, reason: r.ok ? "ok" : `twilio-${r.status}` };
  } catch (err: any) {
    return { sent: false, reason: `twilio-error:${err?.message || "unknown"}` };
  }
}

export async function GET() {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isAdminRole()) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  const invites = await prisma.alumniInvite.findMany({
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
  const { alumniId, email, phone, prefillName, channel } = parsed.data;

  if (channel === "email" && !email) {
    return NextResponse.json({ ok: false, error: "Email is required for the email channel" }, { status: 400 });
  }
  if (channel === "sms" && !phone) {
    return NextResponse.json({ ok: false, error: "Phone is required for the SMS channel" }, { status: 400 });
  }

  // If bound to an existing profile, pull its known details so the invite
  // (and downstream onboarding form) pre-fill. The bound profile is the
  // source of truth for prefill; explicit body fields win if provided.
  let boundAlumni = null as null | { id: string; fullName: string; email: string | null; phone: string | null };
  if (alumniId) {
    const a = await prisma.alumniProfile.findUnique({
      where: { id: alumniId },
      select: { id: true, fullName: true, email: true, phone: true },
    });
    if (!a) {
      return NextResponse.json({ ok: false, error: "Alumni profile not found" }, { status: 404 });
    }
    boundAlumni = a;
  }

  const sender = await getCurrentBrother();
  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const invite = await prisma.alumniInvite.create({
    data: {
      token,
      alumniId: boundAlumni?.id || null,
      email: email || boundAlumni?.email || null,
      phone: phone || boundAlumni?.phone || null,
      prefillName: prefillName || boundAlumni?.fullName || null,
      invitedBy: sender?.name || "Chapter admin",
      expiresAt,
    },
  });

  const link = `${baseUrl(req)}/alumni/onboard/${token}`;
  const senderName = sender?.name || "";
  const [identity, cfg] = await Promise.all([
    getChapterIdentity(),
    getSiteConfig().catch(() => ({} as Record<string, string>)),
  ]);
  const primaryColor = cfg["brand.primaryHex"] || "#a3001a";
  const domain = new URL(baseUrl(req)).hostname.replace("www.", "");

  let delivery: { channel: string; sent: boolean; reason: string } = { channel: "link", sent: false, reason: "manual" };
  const targetEmail = email || boundAlumni?.email || "";
  const targetPhone = phone || boundAlumni?.phone || "";
  if (channel === "email" && targetEmail) {
    const r = await sendEmail(targetEmail, link, senderName, identity, domain, primaryColor);
    delivery = { channel: "email", ...r };
  } else if (channel === "sms" && targetPhone) {
    const r = await sendSms(targetPhone, link, senderName, identity);
    delivery = { channel: "sms", ...r };
  }

  // Audit — never let a logging failure break invite issuance.
  try {
    const actor = actorFromRequest(req, { name: senderName || "Chapter admin", role: "admin" });
    await auditAndNotify("alumni.invite", {
      actor,
      entity: { type: "AlumniInvite", id: invite.id, name: prefillName || boundAlumni?.fullName || targetEmail || "alumnus" },
      payload: { channel, bound: !!boundAlumni, deliverySent: delivery.sent },
    });
  } catch {
    /* ignore */
  }

  return NextResponse.json({ ok: true, invite, link, delivery });
}

export async function DELETE(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isAdminRole()) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = body?.id;
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  await prisma.alumniInvite.update({ where: { id }, data: { status: "REVOKED" } });
  return NextResponse.json({ ok: true });
}
