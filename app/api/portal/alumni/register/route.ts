import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { setPortalCookie } from "@/lib/portal-auth";
import { auditAndNotify, actorFromRequest } from "@/lib/notify";

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

  // Set auth cookie
  setPortalCookie(portalUser.id, "alumni");

  // Log audit
  try {
    const actor = actorFromRequest(req, {
      name: fullName,
      role: "alumni",
    });
    await auditAndNotify("alumni.register", {
      actor,
      entity: { type: "AlumniProfile", id: alumniProfile.id, name: fullName },
      payload: { graduationYear, email: emailNorm, viaInvite: invite?.id ?? null },
    });
  } catch (err) {
    // Ignore audit failures
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: portalUser.id,
      email: portalUser.email,
      role: portalUser.role,
    },
  });
}
