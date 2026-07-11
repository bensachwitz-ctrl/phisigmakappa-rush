import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { setPortalCookie } from "@/lib/portal-auth";
import { auditAndNotify, actorFromRequest } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { renderEmail, renderEmailText } from "@/lib/email-template";
import { getChapterIdentity } from "@/lib/chapter-identity";
import { getSiteConfig } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, maxLen = 200): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, maxLen);
}

/**
 * Validate an AlumniInvite token exactly the way /api/alumni/onboard/[token]
 * does. Returns the invite only when it is live (PENDING + unexpired). Any
 * other state (missing / revoked / completed / expired) yields null so the
 * caller treats the request as token-less.
 */
async function loadLiveInvite(token: string | null) {
  if (!token) return null;
  const invite = await prisma.alumniInvite.findUnique({ where: { token } });
  if (!invite) return null;
  if (invite.status === "REVOKED" || invite.status === "COMPLETED") return null;
  if (invite.expiresAt < new Date()) {
    if (invite.status !== "EXPIRED") {
      await prisma.alumniInvite
        .update({ where: { id: invite.id }, data: { status: "EXPIRED" } })
        .catch(() => {});
    }
    return null;
  }
  return invite;
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fullName = clean(body.fullName, 120);
  if (!fullName) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  }

  const email = clean(body.email, 200);
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  const emailNorm = email.toLowerCase();

  // Password floor raised to 8 to match the invite-based onboarding flow.
  const password = clean(body.password, 100);
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const yearRaw = body.graduationYear;
  const graduationYear =
    typeof yearRaw === "number" ? yearRaw : parseInt(String(yearRaw || ""), 10);
  if (!Number.isFinite(graduationYear) || graduationYear < 1873 || graduationYear > 2099) {
    return NextResponse.json({ error: "A valid graduation year is required." }, { status: 400 });
  }

  // A PortalUser already owning this email means there is already a login —
  // never silently bind a second one or take it over.
  const existingUser = await prisma.portalUser.findUnique({ where: { email: emailNorm } });
  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists. Try signing in instead." },
      { status: 409 }
    );
  }

  // ── Pre-takeover defense ────────────────────────────────────────────────
  // AlumniProfiles are seeded by admins / HQ imports / public directory joins.
  // Previously this PUBLIC endpoint would overwrite any pre-existing profile
  // matching the posted email and bind a brand-new login to it — letting an
  // attacker who merely KNOWS a real alum's email hijack that alum's identity.
  //
  // A new login may attach to a pre-existing AlumniProfile ONLY when ownership
  // is proven by a valid single-use invite token (the same proof the official
  // onboarding flow requires). Without that token, an existing profile means
  // "this person was already added — use your invite link / sign in", and we
  // create NOTHING.
  const token = clean(body.inviteToken ?? body.token, 200);
  const invite = await loadLiveInvite(token);

  // An invite may bind to a specific profile (invite.alumniId) OR vouch for a
  // specific email (invite.email). It only authorizes attaching to a
  // pre-existing profile whose email matches the invite's email or whose id is
  // the invite's bound alumniId.
  const inviteEmail = invite?.email ? invite.email.trim().toLowerCase() : null;
  const inviteAuthorizesEmail = !!invite && (inviteEmail === null || inviteEmail === emailNorm);

  // A registration is "self-serve" unless it is proven by a live, authorizing
  // invite (the same proof the chapter's official onboarding requires). Self-serve
  // sign-ups are UNTRUSTED — they must not receive an alumni session that can read
  // the brother roster (email/phone) or active-PNM contact info until they PROVE
  // control of the email via the verification link below. Invited alumni are
  // trusted (the chapter vouched for them) and are logged in immediately.
  const provenByInvite = !!invite && inviteAuthorizesEmail;

  // CONSENT CAPTURE. The invite-onboarding flow requires a data-use/privacy
  // consent; self-serve previously collected none (a compliance gap). Require the
  // same explicit consent here before creating anything for a self-serve sign-up.
  if (!provenByInvite && body.agreedToDataUse !== true) {
    return NextResponse.json(
      { error: "Please agree to the data-use & privacy terms to create your alumni account." },
      { status: 400 },
    );
  }

  const existingProfile = await prisma.alumniProfile.findFirst({ where: { email } });

  let boundProfileId: string | null = null;
  if (existingProfile) {
    const inviteBindsThisProfile =
      !!invite &&
      inviteAuthorizesEmail &&
      (invite.alumniId === existingProfile.id || invite.alumniId == null);
    if (!inviteBindsThisProfile) {
      // Existing identity + no token-proven ownership → refuse. Do not leak
      // whether the email maps to a profile vs a typo: a generic message.
      return NextResponse.json(
        {
          error:
            "This email is already on file with the chapter. Please use the invite link sent to you, or sign in.",
        },
        { status: 409 }
      );
    }
    boundProfileId = existingProfile.id;
  } else if (invite?.alumniId && inviteAuthorizesEmail) {
    // Invite explicitly binds a profile that isn't matched by email — honor it.
    const bound = await prisma.alumniProfile.findUnique({ where: { id: invite.alumniId } });
    if (bound) boundProfileId = bound.id;
  }

  const age = body.age ? parseInt(String(body.age), 10) : null;
  const profileData = {
    fullName,
    graduationYear,
    preferredName: clean(body.preferredName, 60),
    pledgeClass: clean(body.pledgeClass, 30),
    age: age && !isNaN(age) ? age : null,
    major: clean(body.major, 100),
    phone: clean(body.phone, 30),
    city: clean(body.city, 80),
    state: clean(body.state, 30),
    employer: clean(body.employer, 120),
    jobTitle: clean(body.jobTitle, 120),
    linkedinUrl: clean(body.linkedinUrl, 300),
    bio: clean(body.bio, 500),
  };

  // Bind to the proven profile (update it) or create a fresh one. We only ever
  // reach the update branch when ownership was proven by a valid invite.
  let alumniProfile;
  if (boundProfileId) {
    alumniProfile = await prisma.alumniProfile.update({
      where: { id: boundProfileId },
      data: profileData,
    });
  } else {
    alumniProfile = await prisma.alumniProfile.create({
      data: {
        ...profileData,
        email,
        // Default opt-ins OFF for self-serve sign-ups — explicit consent only.
        optInDirectory: false,
        optInNewsletter: true,
      },
    });
  }

  // Hash password
  const passwordHash = hashPassword(password);

  // Create PortalUser
  const portalUser = await prisma.portalUser.create({
    data: {
      role: "alumni",
      email: emailNorm,
      passwordHash,
      alumniId: alumniProfile.id,
    },
  });

  // Burn the invite (single-use) once it has actually been redeemed.
  if (invite) {
    await prisma.alumniInvite
      .update({ where: { id: invite.id }, data: { status: "COMPLETED", completedAt: new Date() } })
      .catch(() => {});
  }

  // ── Session issuance ─────────────────────────────────────────────────────
  // TRUSTED (invite-proven): the chapter vouched for this person, so log them in
  // immediately. UNTRUSTED (self-serve): do NOT issue a session — issue an email
  // verification link instead. Until they click it, they hold no alumni cookie and
  // therefore cannot reach the dashboard or read the roster / PNM PII at all.
  let pendingVerification = false;
  if (provenByInvite) {
    setPortalCookie(portalUser.id, "alumni");
  } else {
    pendingVerification = true;
    const verifyToken = crypto.randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await prisma.portalUser.update({
      where: { id: portalUser.id },
      data: { magicToken: verifyToken, magicTokenExpiresAt: expiresAt },
    });
    // Best-effort verification email — a send failure must not fail registration
    // (the account exists, unverified; they can request a new link by re-trying).
    try {
      await sendAlumniVerificationEmail(req, emailNorm, fullName, verifyToken);
    } catch (err) {
      console.error("[alumni register] verification email failed:", err);
    }
  }

  // Log audit (records consent + whether a session was issued vs. verification-pending).
  try {
    const actor = actorFromRequest(req, {
      name: fullName,
      role: "alumni",
    });
    await auditAndNotify("alumni.register", {
      actor,
      entity: { type: "AlumniProfile", id: alumniProfile.id, name: fullName },
      payload: {
        graduationYear,
        email: emailNorm,
        viaInvite: invite?.id ?? null,
        consent: provenByInvite ? "invite" : true,
        pendingVerification,
      },
    });
  } catch (err) {
    // Ignore audit failures
  }

  return NextResponse.json({
    ok: true,
    pendingVerification,
    user: {
      id: portalUser.id,
      email: portalUser.email,
      role: portalUser.role,
    },
  });
}

/** Public origin of the request (chapter host), used to build the verify link. */
function requestOrigin(req: Request): string {
  const host = req.headers.get("host") || "greekstack.vercel.app";
  const proto = host.includes("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

/**
 * Send the self-serve alumni email-verification link. Branded with the chapter's
 * identity when available (best-effort — falls back to a neutral email). The link
 * hits GET /api/portal/alumni/verify, which validates the token and only THEN
 * issues the alumni session.
 */
async function sendAlumniVerificationEmail(
  req: Request,
  toEmail: string,
  name: string,
  token: string,
): Promise<void> {
  const link = `${requestOrigin(req)}/api/portal/alumni/verify?token=${encodeURIComponent(token)}`;
  let chapterName = "Your Chapter";
  let brandHex = "";
  try {
    const identity = await getChapterIdentity();
    chapterName = identity?.fraternityName || chapterName;
    const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
    brandHex = cfg["brand.primaryHex"] || "";
  } catch {
    // Neutral fallback — the link is what matters.
  }
  const firstName = name.trim().split(" ")[0] || "there";
  const bodyHtml = `
    <p style="margin:0 0 16px;">Hi ${firstName}, thanks for registering as an alumnus of ${chapterName}.</p>
    <p style="margin:0 0 16px;">Please confirm your email address to activate your alumni account. This link expires in 24 hours.</p>`;
  const html = renderEmail({
    brandHex,
    chapterName,
    heading: "Verify your alumni account",
    bodyHtml,
    cta: { label: "Verify my email", url: link },
    footerNote: "You're receiving this because an alumni account was created with this email. If that wasn't you, you can ignore this message.",
  });
  await sendEmail({
    to: toEmail,
    subject: `Verify your alumni account — ${chapterName}`,
    html,
    text: renderEmailText({
      heading: "Verify your alumni account",
      lines: [
        `Hi ${firstName}, confirm your email to activate your alumni account with ${chapterName}.`,
        `Verify: ${link}`,
        "This link expires in 24 hours.",
      ],
      cta: { label: "Verify my email", url: link },
      chapterName,
    }),
  });
}
