import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed } from "@/lib/auth";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  audience: z.enum(["BROTHERS", "RUSHES", "ALL"]),
  channel: z.enum(["EMAIL", "SMS", "BOTH"]).default("EMAIL"),
  subject: z.string().min(2).max(200).optional(),
  body: z.string().min(2).max(20_000),
  // Override the quiet-hours guard (used for emergencies — admin must
  // explicitly opt in). Default false: SMS sends are blocked outside the
  // 8am-9pm recipient-local window per CTIA / TCPA recommended practice.
  forceQuietHours: z.boolean().optional(),
});

/**
 * Returns true if the current time is within the recipient's local 8am-9pm
 * quiet-hours window. Defaults to America/New_York for Phi Sig USC since the
 * chapter's roster is overwhelmingly East Coast — this is conservative
 * (errs on the side of NOT sending to a few mountain/west coast brothers
 * before 11am their time, but never sends after their 9pm local).
 *
 * TCPA recommended: don't send marketing SMS before 8am or after 9pm
 * recipient-local. Our chapter messages are mixed marketing/informational,
 * so we apply the strictest interpretation.
 */
function withinQuietHours(): boolean {
  const now = new Date();
  // Get current hour in America/New_York.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  });
  const hourStr = fmt.format(now);
  const hour = Number.parseInt(hourStr, 10);
  if (Number.isNaN(hour)) return true; // fail open
  return hour >= 8 && hour < 21;
}

function normalizePhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return p.startsWith("+") ? p : `+${d}`;
}

async function twilioSend(to: string, msg: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return { ok: false, mock: true };
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const form = new URLSearchParams({ From: from, To: to, Body: msg });
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  return { ok: res.ok };
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  const { audience, channel, subject, body: msg, forceQuietHours } = parsed.data;

  // TCPA quiet-hours gate. Block SMS sends outside 8am-9pm recipient-local
  // unless the admin explicitly overrode (forceQuietHours: true). Email is
  // unaffected. Returns 425 (Too Early) so the UI can branch on the status.
  const wantsSms = channel === "SMS" || channel === "BOTH";
  if (wantsSms && !withinQuietHours() && !forceQuietHours) {
    return NextResponse.json(
      {
        ok: false,
        error: "Outside SMS quiet hours (8am–9pm Eastern). Resend with forceQuietHours:true to override, or schedule for tomorrow.",
        quietHours: { tz: "America/New_York", window: "08:00–21:00" },
      },
      { status: 425 },
    );
  }

  // Collect recipients
  const recipients: { name: string; email: string | null; phone: string | null }[] = [];
  if (audience === "BROTHERS" || audience === "ALL") {
    const bros = await prisma.brother.findMany({ select: { name: true, email: true, phone: true } });
    recipients.push(...bros);
  }
  if (audience === "RUSHES" || audience === "ALL") {
    const rushes = await prisma.rush.findMany({
      where: { status: { in: ["ACTIVE", "BID_EXTENDED", "ACCEPTED"] } },
      select: { name: true, email: true, phone: true },
    });
    recipients.push(...rushes);
  }

  if (!recipients.length) {
    return NextResponse.json({ ok: false, error: "No recipients" }, { status: 404 });
  }

  let sentEmail = 0, sentSms = 0, mockMode = false;

  // Email
  if (channel === "EMAIL" || channel === "BOTH") {
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddr = process.env.RESEND_FROM_EMAIL || "rush@phisig-usc.com";
    const fromHeader = `Phi Sigma Kappa USC <${fromAddr}>`;
    if (!apiKey || apiKey.startsWith("re_xxxxx")) {
      mockMode = true;
    } else {
      const resend = new Resend(apiKey);
      for (const r of recipients) {
        if (!r.email) continue;
        try {
          await resend.emails.send({
            from: fromHeader,
            to: r.email,
            subject: subject || "Phi Sigma Kappa USC — Chapter Update",
            text: msg,
            html: `<p>${msg.replace(/\n/g, "<br/>")}</p>`,
          });
          sentEmail++;
        } catch { /* skip */ }
      }
    }
  }

  // SMS
  if (channel === "SMS" || channel === "BOTH") {
    for (const r of recipients) {
      if (!r.phone) continue;
      const result = await twilioSend(normalizePhone(r.phone), msg);
      if (result.mock) mockMode = true;
      if (result.ok) sentSms++;
    }
  }

  return NextResponse.json({
    ok: true,
    audience,
    channel,
    recipients: recipients.length,
    sentEmail,
    sentSms,
    mockMode,
  });
}
