import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderEmail, renderEmailText } from "@/lib/email-template";
import { getChapterIdentity } from "@/lib/chapter-identity";
import { getSiteConfig } from "@/lib/site-config";
import { rateLimit, recordRateLimit, clientIpFromRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-IP + per-account throttle on reset requests: ~10 / hour. Without it, this
// open endpoint can be used to (a) hammer the mail provider / flood a victim's
// inbox with reset emails, and (b) churn the magicToken on a known account
// indefinitely. The same reusable in-memory limiter the portal logins use.
const RESET_REQUEST_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 };

function baseUrl(req: Request) {
  return process.env.SITE_URL || `${new URL(req.url).origin}`;
}

export async function POST(req: Request) {
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

  // Per-IP + per-account rate limit. We key BOTH on the source IP (blocks a
  // single host spraying many addresses) AND on the target account (blocks
  // distributed inbox-flooding / token-churn against one victim). Either bucket
  // tripping → 429. Recorded unconditionally on every request (success or not)
  // so the count reflects real send pressure, not just failures.
  const ip = clientIpFromRequest(req);
  const ipKey = `portal-forgot:ip:${ip}`;
  const acctKey = `portal-forgot:acct:${role}:${email}`;
  const ipRl = rateLimit(ipKey, RESET_REQUEST_LIMIT);
  const acctRl = rateLimit(acctKey, RESET_REQUEST_LIMIT);
  if (!ipRl.ok || !acctRl.ok) {
    const retryAfter = Math.max(ipRl.retryAfterSec, acctRl.retryAfterSec);
    return NextResponse.json(
      { error: "Too many reset requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  recordRateLimit(ipKey, RESET_REQUEST_LIMIT);
  recordRateLimit(acctKey, RESET_REQUEST_LIMIT);

  // Find PortalUser
  const portalUser = await prisma.portalUser.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      role: role,
    },
  });

  if (!portalUser) {
    // Check if they are in the database but not onboarded yet
    if (role === "brother") {
      const brother = await prisma.brother.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      if (brother) {
        return NextResponse.json({
          error: "Your account is not activated yet. Please locate your onboarding email/SMS or contact the Chapter Secretary to request a new invite link.",
        }, { status: 400 });
      }
    } else {
      // In prisma, the model is AlumniProfile
      const alum = await prisma.alumniProfile.findFirst({
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

  await prisma.portalUser.update({
    where: { id: portalUser.id },
    data: {
      magicToken: token,
      magicTokenExpiresAt: expiresAt,
    },
  });

  const base = baseUrl(req);
  const link = `${base}/portal/reset-password?token=${token}`;
  
  // Try sending branded email
  try {
    const identity = await getChapterIdentity();
    const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
    const brandHex = cfg["brand.primaryHex"] || "";

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
