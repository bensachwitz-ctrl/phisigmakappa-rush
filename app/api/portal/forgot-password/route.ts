import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderEmail, renderEmailText } from "@/lib/email-template";
import { getChapterIdentity } from "@/lib/chapter-identity";
import { getSiteConfig } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  // Return token in response if in development/demo context for easy clipboard copy testing
  const isDev = process.env.NODE_ENV === "development" || base.includes("localhost") || base.includes("vercel.app");
  
  return NextResponse.json({
    ok: true,
    message: "If your email is registered in our portal, a password reset link has been sent.",
    ...(isDev ? { token, link } : {}),
  });
}
