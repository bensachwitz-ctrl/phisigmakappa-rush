import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/auth";
import { getTwilioConfig } from "@/lib/messaging-config";
import { getSiteConfig } from "@/lib/site-config";
import { filterOptedOut, isWithinQuietHours } from "@/lib/tcpa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PayloadSchema = z.object({
  rushIds: z.array(z.string().min(1)).min(1).max(500),
  body: z.string().min(1).max(1600),
  // Override the TCPA quiet-hours guard for an emergency send. Mirrors the
  // broadcast route's `forceQuietHours` convention. Default false: SMS sends
  // outside the recipient-local 8am–9pm window are blocked with a 425.
  force: z.boolean().optional(),
});

function normalizePhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return p.startsWith("+") ? p : `+${d}`;
}

async function sendTwilio(opts: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
}) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${opts.accountSid}/Messages.json`;
  const auth = Buffer.from(`${opts.accountSid}:${opts.authToken}`).toString("base64");
  const form = new URLSearchParams({
    From: opts.from,
    To: opts.to,
    Body: opts.body,
  });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Twilio error ${res.status}`);
  }
  return res.json();
}

export async function POST(req: Request) {
  // Admin ROLE only — an SMS blast spends Twilio credits and texts every rushee,
  // so a plain member session (adminFlag=0) must not be able to fire it.
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }

  let payload: z.infer<typeof PayloadSchema>;
  try {
    payload = PayloadSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  // TCPA quiet-hours gate. Block sends outside the recipient-local 8am–9pm
  // window unless the admin explicitly passed force:true. Timezone comes from
  // this tenant's chapter config (defaults to America/New_York). Returns 425
  // (Too Early) so the UI can branch on the status.
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const tz = cfg["chapter.timezone"] || "America/New_York";
  if (!isWithinQuietHours(tz) && !payload.force) {
    return NextResponse.json(
      {
        ok: false,
        error: `Outside SMS quiet hours (8am–9pm ${tz}). Resend with force:true to override, or schedule for tomorrow.`,
        quietHours: { tz, window: "08:00–21:00" },
      },
      { status: 425 },
    );
  }

  const rushes = await prisma.rush.findMany({
    where: { id: { in: payload.rushIds } },
    select: { id: true, phone: true, name: true },
  });
  if (!rushes.length) {
    return NextResponse.json({ ok: false, error: "No matching rushes" }, { status: 404 });
  }

  // TCPA opt-out: drop any rushee whose latest RushConsent is optedOut (texted
  // STOP). A rush with no consent row is allowed. Done BEFORE creds resolution
  // so a fully opted-out batch short-circuits.
  const allowedIds = new Set(await filterOptedOut(prisma, rushes.map((r) => r.id)));
  const targets = rushes.filter((r) => allowedIds.has(r.id));
  const optedOutCount = rushes.length - targets.length;

  if (!targets.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "All selected rushees have opted out of SMS.",
        optedOut: optedOutCount,
      },
      { status: 409 },
    );
  }

  const { accountSid: sid, authToken: token, phoneNumber: from } = await getTwilioConfig();

  if (!sid || !token || !from) {
    await prisma.smsLog.create({
      data: {
        body: payload.body,
        recipients: targets.map((r) => r.phone).join(", "),
        status: "MOCK_NO_CREDS",
      },
    });
    return NextResponse.json({
      ok: true,
      mode: "mock",
      sent: targets.length,
      optedOut: optedOutCount,
      note: "Twilio creds not configured — logged to DB only.",
    });
  }

  const results: { id: string; ok: boolean; err?: string }[] = [];
  for (const r of targets) {
    try {
      const personalized = r.name
        ? `Hey ${r.name.split(" ")[0]} — ${payload.body}`
        : payload.body;
      await sendTwilio({
        accountSid: sid,
        authToken: token,
        from,
        to: normalizePhone(r.phone),
        body: personalized,
      });
      results.push({ id: r.id, ok: true });
    } catch (err: any) {
      results.push({ id: r.id, ok: false, err: err?.message || "Send failed" });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;

  await prisma.smsLog.create({
    data: {
      body: payload.body,
      recipients: targets.map((r) => r.phone).join(", "),
      status: failed === 0 ? "SENT" : sent === 0 ? "FAILED" : "PARTIAL",
    },
  });

  return NextResponse.json({ ok: true, sent, failed, optedOut: optedOutCount, results });
}
