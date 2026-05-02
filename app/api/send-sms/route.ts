import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PayloadSchema = z.object({
  rushIds: z.array(z.string().min(1)).min(1).max(500),
  body: z.string().min(1).max(1600),
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
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof PayloadSchema>;
  try {
    payload = PayloadSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  const rushes = await prisma.rush.findMany({
    where: { id: { in: payload.rushIds } },
    select: { id: true, phone: true, name: true },
  });
  if (!rushes.length) {
    return NextResponse.json({ ok: false, error: "No matching rushes" }, { status: 404 });
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    await prisma.smsLog.create({
      data: {
        body: payload.body,
        recipients: rushes.map((r) => r.phone).join(", "),
        status: "MOCK_NO_CREDS",
      },
    });
    return NextResponse.json({
      ok: true,
      mode: "mock",
      sent: rushes.length,
      note: "Twilio creds not configured — logged to DB only.",
    });
  }

  const results: { id: string; ok: boolean; err?: string }[] = [];
  for (const r of rushes) {
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
      recipients: rushes.map((r) => r.phone).join(", "),
      status: failed === 0 ? "SENT" : sent === 0 ? "FAILED" : "PARTIAL",
    },
  });

  return NextResponse.json({ ok: true, sent, failed, results });
}
