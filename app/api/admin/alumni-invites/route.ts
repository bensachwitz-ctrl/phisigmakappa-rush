import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, getCurrentBrother } from "@/lib/auth";
import { guardOfficer } from "@/lib/permissions";
import { getChapterIdentity, type ChapterIdentity } from "@/lib/chapter-identity";
import { auditAndNotify, actorFromRequest } from "@/lib/notify";
import { getSiteConfig } from "@/lib/site-config";
import { sendEmail } from "@/lib/email";
import { renderEmail, renderEmailText } from "@/lib/email-template";
import { getTwilioConfig } from "@/lib/messaging-config";

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
  // Match brother-invites EXACTLY: SITE_URL, else the request origin — which is
  // THIS chapter's subdomain host (the officer creates the invite while signed
  // into their chapter admin). Do NOT fall back to NEXT_PUBLIC_SITE_URL: on the
  // multi-tenant deploy that is set to the platform APEX, so alumni invite links
  // would resolve to the apex (which can't resolve a tenant) and onboarding would
  // never complete for any chapter's alumni.
  return process.env.SITE_URL || `${new URL(req.url).origin}`;
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

/** Branded alumni-invite email via the chapter's OWN Resend creds (lib/email
 *  resolves per-tenant key + neutral from-address; renderEmail tints the
 *  masthead + CTA with the chapter's brand color, never a hardcoded red). */
async function sendInviteEmail(
  to: string,
  link: string,
  sender: string,
  identity: ChapterIdentity,
  brandHex: string,
) {
  const where = identity.schoolShort ? ` at ${esc(identity.schoolShort)}` : "";
  const portalScope = [identity.greekLetters, "alumni portal"].filter(Boolean).join(" ");
  const html = renderEmail({
    brandHex,
    chapterName: identity.chapterAttribution,
    chapterSubline: identity.schoolName || undefined,
    heading: `Welcome back to ${identity.fraternityShort}.`,
    bodyHtml: `<p style="margin:0;">${
      sender ? `${esc(sender)} from the chapter` : "The chapter"
    } invited you to the ${esc(portalScope)}${where} — see ${identity.terms.membersLower}, vote in alumni polls, RSVP to events, and support the chapter.</p>`,
    cta: { label: "Create your alumni account", url: link },
    footerNote: `Or open this URL: ${esc(link)} · This link is for you only and expires in 30 days.${
      identity.tagline ? ` ${esc(identity.tagline)}` : ""
    }`,
  });
  const text = renderEmailText({
    heading: `Welcome back to ${identity.fraternityShort}.`,
    lines: [
      `${sender ? `${sender} from the chapter` : "The chapter"} invited you to the ${portalScope}${identity.schoolShort ? ` at ${identity.schoolShort}` : ""}.`,
      "This link is for you only and expires in 30 days.",
    ],
    cta: { label: "Create your alumni account", url: link },
    chapterName: identity.chapterAttribution,
  });
  try {
    const res = await sendEmail({
      to,
      subject: `${identity.fraternityName} — create your alumni account`,
      html,
      text,
    });
    return { sent: !!res.ok, reason: res.ok ? "ok" : (res as any).error || "send-failed" };
  } catch (err: any) {
    return { sent: false, reason: `resend-error:${err?.message || "unknown"}` };
  }
}

async function sendSms(to: string, link: string, sender: string, identity: ChapterIdentity) {
  const { accountSid: sid, authToken: token, phoneNumber: from } = await getTwilioConfig();
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
  // alumni:read — the Alumni Relations officer (and any alumni-domain officer)
  // must be able to LIST alumni logins/invites, not just create/delete them. The
  // POST/DELETE below already gate on alumni:write; this aligns the read side so
  // the whole surface works for the role (super-admins pass either way). Was
  // isAdminRole()-only, which locked the new officer out of the list.
  const denied = await guardOfficer("alumni", "read");
  if (denied) return denied;
  const invites = await prisma.alumniInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ ok: true, invites });
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const denied = await guardOfficer("alumni", "write");
  if (denied) return denied;

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
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const identity = await getChapterIdentity();
  const brandHex = cfg["brand.primaryHex"] || "";

  let delivery: { channel: string; sent: boolean; reason: string } = { channel: "link", sent: false, reason: "manual" };
  const targetEmail = email || boundAlumni?.email || "";
  const targetPhone = phone || boundAlumni?.phone || "";
  if (channel === "email" && targetEmail) {
    const r = await sendInviteEmail(targetEmail, link, senderName, identity, brandHex);
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
  const denied = await guardOfficer("alumni", "write");
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const id = body?.id;
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  await prisma.alumniInvite.update({ where: { id }, data: { status: "REVOKED" } });
  return NextResponse.json({ ok: true });
}
