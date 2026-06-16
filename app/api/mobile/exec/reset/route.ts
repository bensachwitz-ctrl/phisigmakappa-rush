import { NextResponse } from "next/server";
import crypto from "crypto";
import { authorizeMobileExec, auditMobileExec } from "@/lib/mobile-exec-auth";
import { mobileCorsHeaders, mobilePreflightResponse } from "@/lib/mobile-cors";
import { sendEmail } from "@/lib/email";
import { renderEmail, renderEmailText } from "@/lib/email-template";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(req: Request) {
  return mobilePreflightResponse(req.headers.get("origin"));
}

function withCors(req: Request, res: NextResponse): NextResponse {
  const headers = mobileCorsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

/**
 * Build the chapter-facing reset link. The mobile call is apex-hosted (no chapter
 * Host header), so we construct the chapter's canonical subdomain origin
 * explicitly: `https://<sub>.greekstack.vercel.app/portal/reset-password?token=…`.
 * An operator override (NEXT_PUBLIC_SITE_URL) wins for self-host / custom apex so
 * the link always lands on a host that actually serves the chapter's reset page.
 */
function resetLink(subdomain: string, token: string): string {
  const override = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");
  const base = override || `https://${subdomain}.greekstack.vercel.app`;
  return `${base}/portal/reset-password?token=${token}`;
}

/**
 * POST /api/mobile/exec/reset — an officer sends a member a password-reset link.
 *
 * Body: { subdomain, brotherId? , email? }  (one of brotherId/email required)
 *
 * OFFICER-GATED server-side (authorizeMobileExec recomputes capabilities.exec).
 * ACTUALLY SENDS: issues a single-use, 2-hour magicToken on the target member's
 * PortalUser row (creating that row from the Brother record if the member has
 * never logged into the portal) and emails the branded reset link via the same
 * pipeline the self-serve /api/portal/forgot-password route uses. Tenant-scoped:
 * all reads/writes go through the caller's chapter `db`.
 *
 * NOTE: unlike the public forgot-password endpoint, this is an authenticated
 * OFFICER action, so we DO return whether the target was found (officers need to
 * know if they typed the wrong member) — there's no enumeration risk because the
 * caller is already a verified officer of this chapter.
 */
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

  const gate = await authorizeMobileExec(req, body.subdomain);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { db, brother: officer, subdomain } = gate;

  const brotherId = String(body.brotherId || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!brotherId && !email) {
    return NextResponse.json({ error: "brotherId or email is required." }, { status: 400 });
  }

  try {
    // Resolve the target Brother (by id, else by email) within THIS chapter.
    const targetBrother = brotherId
      ? await db.brother.findUnique({ where: { id: brotherId } })
      : await db.brother.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });

    if (!targetBrother) {
      return NextResponse.json({ error: "Member not found in this chapter." }, { status: 404 });
    }
    const targetEmail = (targetBrother.email || "").trim().toLowerCase();
    if (!targetEmail) {
      return NextResponse.json(
        { error: "That member has no email on file — add one before sending a reset." },
        { status: 400 },
      );
    }

    // Find or create the member's PortalUser so we have a row to stamp the token
    // on. Mirrors the mobile/auth first-login bootstrap (PortalUser created from
    // the Brother record). We carry over the Brother's passwordHash if present.
    let portalUser = await db.portalUser.findFirst({
      where: { email: { equals: targetEmail, mode: "insensitive" }, role: "brother" },
    });
    if (!portalUser) {
      portalUser = await db.portalUser.create({
        data: {
          role: "brother",
          email: targetEmail,
          passwordHash: targetBrother.passwordHash ?? null,
          brotherId: targetBrother.id,
        },
      });
    }

    // Issue a single-use, 2-hour reset token (same shape + lifetime as the
    // self-serve forgot-password flow).
    const token = crypto.randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await db.portalUser.update({
      where: { id: portalUser.id },
      data: { magicToken: token, magicTokenExpiresAt: expiresAt },
    });

    const link = resetLink(subdomain, token);

    // Branded email — tenant-scoped chapter identity read directly from THIS
    // chapter's siteConfig (getSiteConfig() is Host-proxied + wrong on an apex
    // mobile call, so we read the tenant db here).
    let sent = false;
    try {
      const rows = await db.siteConfig.findMany();
      const cfg: Record<string, string> = {};
      for (const r of rows) cfg[r.key] = r.value;
      const id = chapterIdentityFromCfg(cfg);
      const brandHex = cfg["brand.primaryHex"] || "";

      const html = renderEmail({
        brandHex,
        chapterName: id.chapterAttribution,
        chapterSubline: id.schoolName || undefined,
        heading: "Reset your portal password",
        bodyHtml: `<p style="margin:0;">A chapter officer started a password reset for your account. Click the button below to choose a new password.</p>`,
        cta: { label: "Reset Password", url: link },
        footerNote: `Or paste this URL into your browser: ${link} · This link expires in 2 hours. If you didn't expect this, you can ignore this email.`,
      });
      const text = renderEmailText({
        heading: "Reset your portal password",
        lines: [
          "A chapter officer started a password reset for your account.",
          "This link will expire in 2 hours.",
        ],
        cta: { label: "Reset Password", url: link },
        chapterName: id.chapterAttribution,
      });

      const result = await sendEmail({
        to: targetEmail,
        subject: `Reset your ${id.fraternityShort} portal password`,
        html,
        text,
      });
      sent = result.ok;
    } catch (err) {
      console.error("[mobile/exec/reset] email send failed:", err);
      sent = false;
    }

    await auditMobileExec(db, officer, {
      action: "PASSWORD_RESET_SENT",
      subjectType: "Brother",
      subjectId: targetBrother.id,
      subjectName: targetBrother.name,
      details: `reset link sent to ${targetEmail} by ${officer.name}${sent ? "" : " (email delivery failed)"}`,
      req,
    });

    // Only echo the raw token/link in true local dev (mirrors forgot-password's
    // anti-leak guard) so an officer can copy it when no mailer is configured.
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json({
      ok: true,
      sent,
      target: { brotherId: targetBrother.id, name: targetBrother.name, email: targetEmail },
      ...(isDev ? { token, link } : {}),
    });
  } catch (err: any) {
    console.error("[mobile/exec/reset] error:", err);
    return NextResponse.json({ error: "Unable to send the reset link right now." }, { status: 500 });
  }
}
