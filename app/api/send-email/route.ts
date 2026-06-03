import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed } from "@/lib/auth";
import { getChapterIdentity, type ChapterIdentity } from "@/lib/chapter-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PayloadSchema = z.object({
  rushIds: z.array(z.string().min(1)).min(1).max(500),
  subject: z.string().min(2).max(200),
  body: z.string().min(2).max(20_000),
  replyTo: z.string().email().optional(),
});

function htmlTemplate(opts: { subject: string; body: string; identity: ChapterIdentity }) {
  const { subject, body, identity } = opts;
  // Body is plain text — convert newlines to <br/> and escape HTML
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const html = escaped.replace(/\n/g, "<br/>");

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f7;font-family:Inter,Arial,sans-serif;color:#0B0B0C;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #eaeaef;">
        <tr><td style="background:#C8102E;padding:28px 32px;color:#fff;">
          <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;opacity:.85;">${identity.fraternityName} &middot; ${identity.schoolName}</div>
          <div style="font-size:22px;font-weight:600;margin-top:6px;">${subject.replace(/</g, "&lt;")}</div>
        </td></tr>
        <tr><td style="padding:28px 32px;font-size:15px;line-height:1.65;">
          ${html}
        </td></tr>
        <tr><td style="padding:18px 32px 28px;font-size:12px;color:#71717a;border-top:1px solid #eaeaef;">
          You received this because you registered as a potential new member with ${identity.fraternityName} at ${identity.schoolShort}.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof PayloadSchema>;
  try {
    payload = PayloadSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  const rushes = await prisma.rush.findMany({
    where: { id: { in: payload.rushIds } },
    select: { id: true, email: true, name: true },
  });

  if (!rushes.length) {
    return NextResponse.json({ ok: false, error: "No matching rushes" }, { status: 404 });
  }

  // Chapter identity drives the From header + the masthead in the HTML
  // template. Reference defaults preserve the existing Phi Sig USC look.
  const identity = await getChapterIdentity();
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddr = process.env.RESEND_FROM_EMAIL || "rush@phisig-usc.com";
  const fromHeader = `${identity.chapterAttribution} <${fromAddr}>`;
  const html = htmlTemplate({ subject: payload.subject, body: payload.body, identity });

  // No Resend key — log & return success in mock mode (useful for dev)
  if (!apiKey || apiKey.startsWith("re_xxxxx")) {
    await prisma.emailLog.create({
      data: {
        subject: payload.subject,
        body: payload.body,
        recipients: rushes.map((r) => r.email).join(", "),
        status: "MOCK_NO_KEY",
      },
    });
    return NextResponse.json({
      ok: true,
      mode: "mock",
      sent: rushes.length,
      note: "RESEND_API_KEY not configured — logged to DB only.",
    });
  }

  const resend = new Resend(apiKey);
  const results: { id: string; ok: boolean; err?: string }[] = [];

  // Resend supports up to 50 recipients per call via batch; we send individually
  // for personalization and to avoid exposing emails via Bcc-style leaks.
  for (const r of rushes) {
    try {
      const personalized = html.replace(
        '<tr><td style="padding:28px 32px;font-size:15px;line-height:1.65;">',
        `<tr><td style="padding:28px 32px;font-size:15px;line-height:1.65;">
          <p style="margin:0 0 14px;">${r.name ? `Hey ${r.name.split(" ")[0]},` : "Hey,"}</p>`
      );
      const res = await resend.emails.send({
        from: fromHeader,
        to: r.email,
        subject: payload.subject,
        html: personalized,
        text: payload.body,
        ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
      });
      if ("error" in res && res.error) {
        results.push({ id: r.id, ok: false, err: res.error.message });
      } else {
        results.push({ id: r.id, ok: true });
      }
    } catch (err: any) {
      results.push({ id: r.id, ok: false, err: err?.message || "Send failed" });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;

  await prisma.emailLog.create({
    data: {
      subject: payload.subject,
      body: payload.body,
      recipients: rushes.map((r) => r.email).join(", "),
      status: failed === 0 ? "SENT" : sent === 0 ? "FAILED" : "PARTIAL",
    },
  });

  return NextResponse.json({ ok: true, sent, failed, results });
}
