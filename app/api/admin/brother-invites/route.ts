import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, getCurrentBrother } from "@/lib/auth";

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

async function sendEmail(to: string, link: string, sender: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "no-resend" };
  const from = process.env.RESEND_FROM || "Phi Sigma Kappa USC <onboarding@phisig-usc.com>";
  const html = `
    <div style="font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0a0a0a">
      <h1 style="font-size:22px;margin:0 0 6px">You're being added to Phi Sig.</h1>
      <p style="color:#52525b;margin:0 0 18px">${sender ? `${sender} from the chapter` : "The chapter"} invited you to join the brothers directory at Gamma Triton, USC.</p>
      <p style="margin:18px 0">
        <a href="${link}" style="display:inline-block;background:#a3001a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">Complete your brother profile</a>
      </p>
      <p style="color:#71717a;font-size:12px;margin-top:24px">Or open this URL: ${link}</p>
      <p style="color:#71717a;font-size:12px">Link expires in 30 days. #DamnProud</p>
    </div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ from, to, subject: "Welcome to Phi Sigma Kappa — finish your profile", html }),
  });
  return { sent: r.ok, reason: r.ok ? "ok" : `resend-${r.status}` };
}

async function sendSms(to: string, link: string, sender: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return { sent: false, reason: "no-twilio" };
  const msg = `${sender || "Phi Sig USC"}: you're being added as a brother. Finish your profile here: ${link}`;
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
  const invites = await prisma.brotherInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ ok: true, invites });
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
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

  let delivery: { channel: string; sent: boolean; reason: string } = { channel: "link", sent: false, reason: "manual" };
  if (channel === "email" && email) {
    const r = await sendEmail(email, link, senderName);
    delivery = { channel: "email", ...r };
  } else if (channel === "sms" && phone) {
    const r = await sendSms(phone, link, senderName);
    delivery = { channel: "sms", ...r };
  }

  return NextResponse.json({ ok: true, invite, link, delivery });
}

export async function DELETE(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = body?.id;
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  await prisma.brotherInvite.update({ where: { id }, data: { status: "REVOKED" } });
  return NextResponse.json({ ok: true });
}
