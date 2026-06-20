import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed } from "@/lib/auth";
import { guardOfficer } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { getChapterIdentity } from "@/lib/chapter-identity";
import { getSiteConfig } from "@/lib/site-config";
import { filterOptedOut, isWithinQuietHours } from "@/lib/tcpa";
import { renderEmail } from "@/lib/email-template";
import { sendEmail } from "@/lib/email";
import { sendBulkSms, type SmsRecipient } from "@/lib/sms";

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

export async function POST(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  // Broadcast can fan out SMS + email to the whole chapter / rushee list.
  // Once Twilio + Resend keys are set in prod, a member could otherwise
  // spam every brother. Admins or officers holding announcements:write.
  const denied = await guardOfficer("announcements", "write");
  if (denied) return denied;

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  const { audience, channel, subject, body: msg, forceQuietHours } = parsed.data;

  // Chapter config drives both the quiet-hours timezone and the From-line.
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const tz = cfg["chapter.timezone"] || "America/New_York";

  // TCPA quiet-hours gate. Block SMS sends outside 8am-9pm recipient-local
  // unless the admin explicitly overrode (forceQuietHours: true). Email is
  // unaffected. Returns 425 (Too Early) so the UI can branch on the status.
  const wantsSms = channel === "SMS" || channel === "BOTH";
  if (wantsSms && !isWithinQuietHours(tz) && !forceQuietHours) {
    return NextResponse.json(
      {
        ok: false,
        error: `Outside SMS quiet hours (8am–9pm ${tz}). Resend with forceQuietHours:true to override, or schedule for tomorrow.`,
        quietHours: { tz, window: "08:00–21:00" },
      },
      { status: 425 },
    );
  }

  // Collect recipients. `rushId` is carried for rushees so opted-out PNMs can
  // be excluded from the SMS set below (brothers have no RushConsent → null).
  const recipients: { name: string; email: string | null; phone: string | null; rushId: string | null }[] = [];
  if (audience === "BROTHERS" || audience === "ALL") {
    const bros = await prisma.brother.findMany({ select: { name: true, email: true, phone: true } });
    recipients.push(...bros.map((b) => ({ ...b, rushId: null })));
  }
  if (audience === "RUSHES" || audience === "ALL") {
    const rushes = await prisma.rush.findMany({
      where: { status: { in: ["ACTIVE", "BID_EXTENDED", "ACCEPTED"] } },
      select: { id: true, name: true, email: true, phone: true },
    });
    recipients.push(...rushes.map((r) => ({ name: r.name, email: r.email, phone: r.phone, rushId: r.id })));
  }

  if (!recipients.length) {
    return NextResponse.json({ ok: false, error: "No recipients" }, { status: 404 });
  }

  let sentEmail = 0, sentSms = 0, mockMode = false;
  // Chapter identity is the From-line. Falls back to Phi Sig USC reference
  // values, so an existing deploy renders identically.
  const identity = await getChapterIdentity();

  // Email — sent via lib/email (listmonk transactional → Resend → mock). The
  // provider is chosen inside sendEmail(); when neither is configured it returns
  // provider:"mock" and we flag mockMode so the UI shows "logged, no send creds".
  if (channel === "EMAIL" || channel === "BOTH") {
    const brandHex = cfg["brand.primaryHex"] || "";
    const emailSubject = subject || `${identity.chapterAttribution} — Chapter Update`;
    // HTML-escape the admin-typed message before HTML-interpolating into the
    // email body. Admin-only field, but defense-in-depth — a malicious admin
    // shouldn't be able to ship arbitrary HTML (cloaked links, tracking pixels)
    // to members/rushees via the chapter's verified sender domain.
    const safeBody = msg
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/\n/g, "<br/>");
    // Branded wrapper: masthead in the chapter's brand color + a footer with
    // the chapter name, a neutral platform line, and a CAN-SPAM unsubscribe line.
    const html = renderEmail({
      brandHex,
      chapterName: identity.chapterAttribution,
      chapterSubline: identity.schoolName || undefined,
      heading: emailSubject,
      bodyHtml: `<div>${safeBody}</div>`,
      unsubscribe: true,
      unsubscribeText:
        "You received this as a member of this chapter. Reply STOP to opt out of broadcast messages.",
    });
    for (const r of recipients) {
      if (!r.email) continue;
      const res = await sendEmail({
        to: r.email,
        subject: emailSubject,
        html,
        text: msg,
      });
      if (res.ok && res.provider === "mock") mockMode = true;
      else if (res.ok) sentEmail++;
    }
  }

  // SMS — dispatched via lib/sms (textbee → Twilio → mock), with the TCPA
  // quiet-hours + opt-in guards applied inside the helper. The rushee STOP/
  // opt-out filter (RushConsent) is applied HERE first since it requires a DB
  // lookup against the consent table.
  let optedOutSms = 0;
  if (channel === "SMS" || channel === "BOTH") {
    // Candidate SMS recipients = anyone with a phone.
    const smsRecipients = recipients.filter((r) => r.phone);

    // TCPA opt-out: drop any rushee whose latest RushConsent is optedOut
    // (texted STOP). Only rushees have consent rows; brothers (rushId null)
    // are never filtered here. A rushee with no consent row is allowed.
    const rushIds = smsRecipients.map((r) => r.rushId).filter((id): id is string => !!id);
    const allowedRushIds = new Set(rushIds.length ? await filterOptedOut(prisma, rushIds) : []);
    const smsTargets = smsRecipients.filter((r) => r.rushId === null || allowedRushIds.has(r.rushId));
    optedOutSms = smsRecipients.length - smsTargets.length;

    if (smsTargets.length) {
      // The quiet-hours gate was already enforced above (425) for the whole
      // request; pass force:true here so the helper doesn't double-block after
      // the admin explicitly passed forceQuietHours. Per-member opt-in is left
      // undefined (allowed) — chapter brothers are an established relationship;
      // rushee opt-out is enforced via the RushConsent filter above.
      const smsTargetList: SmsRecipient[] = smsTargets.map((r) => ({
        phone: r.phone!,
        name: r.name,
      }));
      const result = await sendBulkSms(smsTargetList, msg, { force: true });
      sentSms += result.sent;
      if (result.provider === "mock" && smsTargets.length) mockMode = true;
    }
  }

  // Audit the broadcast so the e-board can answer "who blasted that?"
  // months later. Subject = the audience name, details = channel + counts.
  await audit({
    action: "BROADCAST_SENT",
    subjectType: "Broadcast",
    subjectId: null,
    subjectName: `${audience} (${recipients.length} recipients)`,
    details: `${channel}${sentEmail ? ` · ${sentEmail} email` : ""}${sentSms ? ` · ${sentSms} sms` : ""}${optedOutSms ? ` · ${optedOutSms} opted-out` : ""}${mockMode ? " · mock mode" : ""}`,
    req,
  });

  return NextResponse.json({
    ok: true,
    audience,
    channel,
    recipients: recipients.length,
    sentEmail,
    sentSms,
    optedOutSms,
    mockMode,
  });
}
