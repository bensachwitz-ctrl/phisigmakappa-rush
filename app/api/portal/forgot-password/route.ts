import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma, centralDb, getTenantClient } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderEmail, renderEmailText } from "@/lib/email-template";
import { getChapterIdentity, chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { getSiteConfig } from "@/lib/site-config";
import { getClientIp } from "@/lib/client-ip";
import { checkDbThrottle, recordDbAttempt, type DbThrottleOptions } from "@/lib/rate-limit";
import { mobileCorsHeaders, mobilePreflightResponse } from "@/lib/mobile-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CORS preflight for the bundled native app. The native shell calls this cross-
// origin (apex-hosted backend, Capacitor origin) before login (no token yet) with
// a Content-Type header, so the WebView fires an OPTIONS preflight. The web app is
// same-origin and never preflights — it sees no CORS header and behaves exactly as
// before.
export function OPTIONS(req: Request) {
  return mobilePreflightResponse(req.headers.get("origin"));
}

function withCors(req: Request, res: NextResponse): NextResponse {
  const headers = mobileCorsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

// Per-IP + per-account throttle on reset requests: ~10 / hour. Without it, this
// open endpoint can be used to (a) hammer the mail provider / flood a victim's
// inbox with reset emails, and (b) churn the magicToken on a known account
// indefinitely. DB-backed (shared RushSubmitLog count) so the cap holds across
// serverless instances, keyed on the non-forgeable getClientIp.
const RESET_REQUEST_LIMIT: DbThrottleOptions = {
  limit: 10,
  windowMs: 60 * 60 * 1000,
  status: "PORTAL_FORGOT_REQUEST",
};

function baseUrl(req: Request) {
  return process.env.SITE_URL || `${new URL(req.url).origin}`;
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

  const email = String(body.email || "").trim().toLowerCase();
  const role = String(body.role || "").trim().toLowerCase(); // "brother" | "alumni"

  if (!email || !role) {
    return NextResponse.json({ error: "Email and role are required." }, { status: 400 });
  }

  if (role !== "brother" && role !== "alumni") {
    return NextResponse.json({ error: "Invalid portal role." }, { status: 400 });
  }

  // TENANT RESOLUTION. The web app posts no subdomain and resolves the chapter via
  // the Host-proxy `prisma` (unchanged). The bundled native shell is apex-hosted
  // (no chapter Host header), so it carries the chapter `subdomain` in the body;
  // we bind an explicit tenant client for it. Either way `db` is the chapter's DB.
  const bodySubdomain = String(body.subdomain || "").trim().toLowerCase();
  let db = prisma;
  if (bodySubdomain) {
    const tenant = await centralDb.tenant
      .findUnique({ where: { subdomain: bodySubdomain } })
      .catch(() => null);
    if (!tenant) {
      return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
    }
    if (!tenant.isActive) {
      return NextResponse.json({ error: "This chapter is inactive." }, { status: 403 });
    }
    db = getTenantClient(bodySubdomain);
  }

  // Per-IP + per-account rate limit. We key BOTH on the source IP (blocks a
  // single host spraying many addresses) AND on the target account (blocks
  // distributed inbox-flooding / token-churn against one victim). Either
  // dimension tripping → 429. DB-backed against the resolved chapter schema so
  // the count is shared across instances (`db` is the tenant client on the native
  // path, the Host-proxied tenant on the web path).
  const throttleKeys = { ip: getClientIp(req), account: `forgot:${role}:${email}` };
  const rl = await checkDbThrottle(db, throttleKeys, RESET_REQUEST_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many reset requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
  // Recorded unconditionally on every request (success or not) so the count
  // reflects real send pressure, not just failures.
  await recordDbAttempt(db, throttleKeys, RESET_REQUEST_LIMIT);

  // Find PortalUser
  const portalUser = await db.portalUser.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      role: role,
    },
  });

  if (!portalUser) {
    // Check if they are in the database but not onboarded yet
    if (role === "brother") {
      const brother = await db.brother.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      if (brother) {
        return NextResponse.json({
          error: "Your account is not activated yet. Please locate your onboarding email/SMS or contact the Chapter Secretary to request a new invite link.",
        }, { status: 400 });
      }
    } else {
      // In prisma, the model is AlumniProfile
      const alum = await db.alumniProfile.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      if (alum) {
        return NextResponse.json({
          error: "Your alumni account is not activated yet. Please register first or ask an administrator for an invite link.",
        }, { status: 400 });
      }
    }

    // Generic successful message to prevent enumeration, but indicating nothing found
    return NextResponse.json({
      ok: true,
      message: "If your email is registered in our portal, a password reset link has been sent.",
    });
  }

  // Generate reset token
  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

  await db.portalUser.update({
    where: { id: portalUser.id },
    data: {
      magicToken: token,
      magicTokenExpiresAt: expiresAt,
    },
  });

  // Reset link host: web derives it from the request origin (unchanged). The
  // native call is apex-hosted, so we build the chapter's canonical subdomain
  // origin explicitly (mirrors app/api/mobile/exec/reset) so the link lands on a
  // host that actually serves THIS chapter's reset page.
  const base = bodySubdomain
    ? (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "") ||
      `https://${bodySubdomain}.greekstack.vercel.app`
    : baseUrl(req);
  const link = `${base}/portal/reset-password?token=${token}`;

  // Try sending branded email
  try {
    // Chapter identity: on the native (subdomain) path read it from THIS tenant's
    // siteConfig (getChapterIdentity/getSiteConfig are Host-proxied → wrong on an
    // apex call). On the web path keep the existing Host-proxied helpers.
    let identity;
    let brandHex = "";
    if (bodySubdomain) {
      const rows = await db.siteConfig.findMany().catch(() => [] as { key: string; value: string }[]);
      const cfg: Record<string, string> = {};
      for (const r of rows) cfg[r.key] = r.value;
      identity = chapterIdentityFromCfg(cfg);
      brandHex = cfg["brand.primaryHex"] || "";
    } else {
      identity = await getChapterIdentity();
      const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
      brandHex = cfg["brand.primaryHex"] || "";
    }

    const html = renderEmail({
      brandHex,
      chapterName: identity.chapterAttribution,
      chapterSubline: identity.schoolName || undefined,
      heading: "Reset your Greekstack password",
      bodyHtml: `<p style="margin:0;">A request was made to reset the password for your Greekstack account. Click the button below to choose a new password.</p>`,
      cta: { label: "Reset Password", url: link },
      footerNote: `Or copy and paste this URL into your browser: ${link} · This link will expire in 2 hours.`,
    });

    const text = renderEmailText({
      heading: "Reset your Greekstack password",
      lines: [
        "A request was made to reset the password for your Greekstack account.",
        "This link will expire in 2 hours.",
      ],
      cta: { label: "Reset Password", url: link },
      chapterName: identity.chapterAttribution,
    });

    await sendEmail({
      to: email,
      subject: `Reset your ${identity.fraternityShort} Portal Password`,
      html,
      text,
    });
  } catch (err) {
    console.error("Failed to send reset email:", err);
  }

  // SECURITY: only ever echo the token/link in TRUE local development. The old
  // check also matched `localhost`/`vercel.app` substrings — but production runs
  // on *.vercel.app, so the token was leaking in the response to any unauthenticated
  // caller → account takeover (request a reset for any email, read the token here,
  // then POST it to /reset-password). The token must only leave the server via the
  // emailed link. NODE_ENV is the only trustworthy signal.
  const isDev = process.env.NODE_ENV === "development";

  return NextResponse.json({
    ok: true,
    message: "If your email is registered in our portal, a password reset link has been sent.",
    ...(isDev ? { token, link } : {}),
  });
}
