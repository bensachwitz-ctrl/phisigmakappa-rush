import { NextResponse } from "next/server";
import { authorizeMobileExec, auditMobileExec } from "@/lib/mobile-exec-auth";
import { mobileCorsHeaders, mobilePreflightResponse } from "@/lib/mobile-cors";
import { sendEmail } from "@/lib/email";
import { renderEmail, renderEmailText } from "@/lib/email-template";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/exec/dues-reminder — an officer broadcasts a dues reminder to
 * every active member who has NOT paid their current-period dues.
 *
 * Body: { subdomain }
 *
 * OFFICER-GATED server-side (authorizeMobileExec recomputes capabilities.exec
 * from the verified session + the member's REAL admin-set position — never a
 * client flag). REAL action: finds unpaid active brothers WITH an email and
 * sends each a branded dues-reminder email; returns the HONEST count actually
 * sent (and a graceful message when there is nobody to remind). No fake "sent"
 * toast — the client reports exactly what the server did.
 */
export function OPTIONS(req: Request) {
  return mobilePreflightResponse(req.headers.get("origin"));
}

function withCors(req: Request, res: NextResponse): NextResponse {
  const headers = mobileCorsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

export async function POST(req: Request) {
  return withCors(req, await handlePost(req));
}

async function handlePost(req: Request): Promise<NextResponse> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const gate = await authorizeMobileExec(req, body?.subdomain);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { db, brother: officer } = gate;

  try {
    // Online dues must be enabled for a chapter to chase dues from the app.
    const enabledCfg = await db.siteConfig
      .findUnique({ where: { key: "dues.enabled" } })
      .catch(() => null);
    if (enabledCfg?.value !== "true") {
      return NextResponse.json(
        { error: "Online dues are not enabled for this chapter." },
        { status: 409 },
      );
    }

    // Unpaid active members WITH an email to send to. duesPaid is the canonical
    // paid flag (see schema). We only chase ACTIVE/INITIATE members (pledges and
    // alumni are out of scope for active dues).
    const unpaid = await db.brother.findMany({
      where: {
        duesPaid: false,
        status: { in: ["ACTIVE", "INITIATE"] },
        email: { not: null },
      },
      select: { id: true, name: true, email: true },
    });

    const recipients = unpaid
      .map((b) => (b.email || "").trim())
      .filter((e) => e.length > 0);

    if (recipients.length === 0) {
      // Honest "nothing to do" — never a fake success.
      return NextResponse.json({
        ok: true,
        sent: 0,
        message: "Everyone is paid up — no reminders to send.",
      });
    }

    // White-label the reminder from THIS chapter's config (apex-hosted mobile
    // call carries no Host, so read the tenant db directly — never the proxy).
    const cfgRows = await db.siteConfig.findMany().catch(() => [] as { key: string; value: string }[]);
    const cfg = Object.fromEntries(cfgRows.map((r) => [r.key, r.value]));
    const id = chapterIdentityFromCfg(cfg);
    const brandHex = cfg["brand.primaryHex"] || "";
    const duesLabel = cfg["dues.label"] || "Chapter dues";
    const period = cfg["dues.year"] || "";

    const heading = "Friendly dues reminder";
    const bodyHtml = `
      <p style="margin:0 0 16px;">This is a friendly reminder that your ${escHtml(duesLabel)}${period ? ` for ${escHtml(period)}` : ""} are still outstanding.</p>
      <p style="margin:0 0 16px;">You can pay securely from the chapter app or portal. If you have already paid, please disregard this message — it can take a moment to update.</p>
      <p style="margin:0;">Thank you for keeping the chapter in good standing.</p>`;
    const html = renderEmail({
      brandHex,
      chapterName: id.chapterAttribution || id.fraternityName,
      chapterSubline: id.schoolName || undefined,
      heading,
      bodyHtml,
      footerNote: `Sent by an officer of ${escHtml(id.fraternityName)} via the chapter app.`,
    });
    const text = renderEmailText({
      heading,
      lines: [
        `Your ${duesLabel}${period ? ` for ${period}` : ""} are still outstanding.`,
        "You can pay securely from the chapter app or portal.",
        "If you have already paid, please disregard this message.",
      ],
      chapterName: id.chapterAttribution || id.fraternityName,
    });

    // Send. sendEmail accepts a recipient array (one send, provider-batched).
    // A provider failure surfaces honestly as a 502 — never a fake "sent".
    const result = await sendEmail({
      to: recipients,
      subject: `Dues reminder — ${id.fraternityName}`,
      html,
      text,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "Could not send reminders right now. Try again shortly." },
        { status: 502 },
      );
    }

    await auditMobileExec(db, officer, {
      action: "DUES_REMINDER_SENT",
      subjectType: "Chapter",
      subjectId: null,
      subjectName: id.fraternityName,
      details: `dues reminder sent via app by ${officer.name} to ${recipients.length} unpaid member(s)`,
      req,
    });

    return NextResponse.json({
      ok: true,
      sent: recipients.length,
      message:
        recipients.length === 1
          ? "Reminder sent to 1 unpaid member."
          : `Reminders sent to ${recipients.length} unpaid members.`,
    });
  } catch (err: any) {
    console.error("[mobile/exec/dues-reminder] error:", err);
    return NextResponse.json(
      { error: "Unable to send dues reminders right now." },
      { status: 500 },
    );
  }
}

/** Escape plain strings for safe HTML interpolation in the email body. */
function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
