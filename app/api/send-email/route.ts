import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { withOfficer } from "@/lib/permissions";
import { getChapterIdentity, type ChapterIdentity } from "@/lib/chapter-identity";
import { getSiteConfig } from "@/lib/site-config";
import { getResendConfig } from "@/lib/messaging-config";
import { renderEmail } from "@/lib/email-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PayloadSchema = z.object({
  rushIds: z.array(z.string().min(1)).min(1).max(500),
  subject: z.string().min(2).max(200),
  body: z.string().min(2).max(20_000),
  replyTo: z.string().email().optional(),
});

/** Escape plain text for safe HTML interpolation. */
function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Build the branded rush-blast HTML for one recipient. The masthead + (no CTA
 * here) chrome render in THIS chapter's brand color via renderEmail — the old
 * template hardcoded Demo Chapter cardinal (#C8102E). `greeting` personalizes the
 * lead line ("Hey Alex,"). Body is admin-typed plain text → escaped + <br/>.
 */
function blastHtml(opts: {
  subject: string;
  body: string;
  greeting: string;
  identity: ChapterIdentity;
  brandHex: string;
}): string {
  const { subject, body, greeting, identity, brandHex } = opts;
  const bodyHtml = `${greeting ? `<p style="margin:0 0 14px;">${escHtml(greeting)}</p>` : ""}<div>${escHtml(
    body,
  ).replace(/\n/g, "<br/>")}</div>`;
  return renderEmail({
    brandHex,
    chapterName: identity.fraternityName,
    chapterSubline: identity.schoolName || undefined,
    heading: subject,
    bodyHtml,
    footerNote: `You received this because you registered as a potential new member with ${esc2(
      identity.fraternityName,
    )}${identity.schoolShort ? ` at ${esc2(identity.schoolShort)}` : ""}.`,
    unsubscribe: true,
    unsubscribeText: "Reply to this email and ask us to remove you, and we will.",
  });
}

/** Footer-note escape (renderEmail escapes heading/chapterName itself, but the
 *  footerNote string is interpolated verbatim, so escape chapter values here). */
function esc2(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Sending a branded rush blast costs Resend credits and emails every selected
// PNM, so this is gated like /api/admin/enrich: the withOfficer wrapper does the
// isAdminAuthed() 401 pre-check AND the officer/admin floor
// (guardOfficer("rushPipeline","write")) before the handler runs. A plain member
// cookie (adminFlag=0, zero assignments) — valid for the tenant but not an
// officer — is now 403'd instead of being able to fire the blast.
export const POST = withOfficer("rushPipeline", "write", async (req: Request) => {
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
  // template. Per-tenant Resend creds (SiteConfig) with env fallback; the
  // from-ADDRESS defaults to a NEUTRAL platform address (never a tenant
  // domain) when this chapter hasn't set resend.fromEmail. brandHex tints the
  // masthead so a navy/gold chapter no longer sends a red email.
  const identity = await getChapterIdentity();
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const brandHex = cfg["brand.primaryHex"] || "";
  const { apiKey, fromEmail: fromAddr } = await getResendConfig();
  const fromHeader = `${identity.chapterAttribution} <${fromAddr}>`;

  // No Resend key — log & return success in mock mode (useful for dev)
  if (!apiKey) {
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
      const greeting = r.name ? `Hey ${r.name.split(" ")[0]},` : "Hey,";
      const personalized = blastHtml({
        subject: payload.subject,
        body: payload.body,
        greeting,
        identity,
        brandHex,
      });
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
});
