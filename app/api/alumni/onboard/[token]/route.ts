import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { setPortalCookie } from "@/lib/portal-auth";
import { auditAndNotify, actorFromRequest } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { getChapterIdentity } from "@/lib/chapter-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// R47 — branded welcome email sent the moment an alum finishes onboarding.
// Fire-and-forget: never blocks the response, and sendEmail() already
// no-ops gracefully (mock mode) when RESEND_API_KEY isn't configured, so
// this is safe in every environment.
async function sendWelcomeEmail(opts: { to: string; firstName: string; siteUrl: string }) {
  let identity;
  try {
    identity = await getChapterIdentity();
  } catch {
    identity = null;
  }
  const fratName = identity?.fraternityName || "Your Chapter";
  const fratShort = identity?.fraternityShort || "Your Chapter";
  const greek = identity?.greekLetters || "";
  const school = identity?.schoolShort || "";
  const tagline = identity?.tagline || "";
  const dash = `${opts.siteUrl.replace(/\/$/, "")}/portal/alumni/dashboard`;
  const html = `
    <div style="font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0a0a0a">
      <h1 style="font-size:22px;margin:0 0 6px">Welcome to the ${fratShort} alumni portal, ${opts.firstName}.</h1>
      <p style="color:#52525b;margin:0 0 18px">Your account is live. You're now connected to ${greek ? greek + " · " : ""}${school} — the active chapter and your fellow alumni.</p>
      <p style="color:#3f3f46;margin:0 0 8px;font-weight:600">From your dashboard you can:</p>
      <ul style="color:#52525b;margin:0 0 18px;padding-left:18px;line-height:1.6">
        <li>See the active brother roster and your alumni network</li>
        <li>Vote in alumni polls and RSVP to chapter events</li>
        <li>Vouch for PNMs during rush</li>
        <li>Support the chapter with a secure donation</li>
      </ul>
      <p style="margin:18px 0">
        <a href="${dash}" style="display:inline-block;background:#a3001a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">Open your dashboard</a>
      </p>
      <p style="color:#71717a;font-size:12px;margin-top:24px">You're receiving this because you created a ${fratName} alumni portal account. ${tagline}</p>
    </div>`;
  return sendEmail({
    to: opts.to,
    subject: `Welcome to the ${fratName} alumni portal`,
    html,
    text: `Welcome to the ${fratShort} alumni portal, ${opts.firstName}. Your account is live — open your dashboard: ${dash}`,
  });
}

// R45 — Alumni portal onboarding redemption.
//
// GET  /api/alumni/onboard/[token]  → validate the invite + return prefill
// POST /api/alumni/onboard/[token]  → redeem: create/attach AlumniProfile +
//      PortalUser(role=alumni), mark invite COMPLETED (single-use), auto-login.
//
// Security:
//   - token is the only credential; carries no PII, random 24 bytes.
//   - single-use: redeeming flips status → COMPLETED so a forwarded link
//     can't create a second account.
//   - expiry enforced on every load (auto-flips → EXPIRED past expiresAt).
//   - revoked invites (admin DELETE) are rejected.
//   - email uniqueness enforced against PortalUser so an alum can't end up
//     with two portal logins.
// Compliance:
//   - `consent` (data-use acknowledgement) is REQUIRED — POST 400s without it.
//   - directory + newsletter opt-ins are explicit booleans the alum controls.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SubmitSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(200),
  password: z.string().min(8).max(120),
  confirmPassword: z.string().min(8).max(120),
  graduationYear: z.union([z.number(), z.string()]),
  preferredName: z.string().max(60).optional().or(z.literal("")),
  pledgeClass: z.string().max(30).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  state: z.string().max(30).optional().or(z.literal("")),
  employer: z.string().max(120).optional().or(z.literal("")),
  jobTitle: z.string().max(120).optional().or(z.literal("")),
  linkedinUrl: z.string().max(300).optional().or(z.literal("")),
  bio: z.string().max(500).optional().or(z.literal("")),
  optInDirectory: z.boolean().optional(),
  optInNewsletter: z.boolean().optional(),
  consent: z.boolean(),
});

function clean(v: unknown, maxLen = 200): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, maxLen);
}

async function loadInvite(token: string) {
  const invite = await prisma.alumniInvite.findUnique({ where: { token } });
  if (!invite) return { invite: null, reason: "not-found" as const };
  if (invite.status === "REVOKED") return { invite, reason: "revoked" as const };
  if (invite.status === "COMPLETED") return { invite, reason: "completed" as const };
  if (invite.expiresAt < new Date()) {
    if (invite.status !== "EXPIRED") {
      await prisma.alumniInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    }
    return { invite, reason: "expired" as const };
  }
  return { invite, reason: "ok" as const };
}

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const { invite, reason } = await loadInvite(params.token);
  if (!invite) {
    return NextResponse.json({ ok: false, reason: "not-found", error: "Invite not found" }, { status: 404 });
  }

  // If bound to an existing profile, surface its known details so the form
  // pre-fills. Never leak more than the onboarding form needs.
  let prefill: Record<string, unknown> = {
    fullName: invite.prefillName || "",
    email: invite.email || "",
    phone: invite.phone || "",
  };
  if (invite.alumniId) {
    const a = await prisma.alumniProfile.findUnique({
      where: { id: invite.alumniId },
      select: {
        fullName: true, preferredName: true, graduationYear: true, pledgeClass: true,
        email: true, phone: true, city: true, state: true, employer: true,
        jobTitle: true, linkedinUrl: true, bio: true,
        optInDirectory: true, optInNewsletter: true,
      },
    });
    if (a) {
      prefill = {
        fullName: a.fullName || invite.prefillName || "",
        preferredName: a.preferredName || "",
        graduationYear: a.graduationYear || "",
        pledgeClass: a.pledgeClass || "",
        email: a.email || invite.email || "",
        phone: a.phone || invite.phone || "",
        city: a.city || "",
        state: a.state || "",
        employer: a.employer || "",
        jobTitle: a.jobTitle || "",
        linkedinUrl: a.linkedinUrl || "",
        bio: a.bio || "",
        optInDirectory: a.optInDirectory,
        optInNewsletter: a.optInNewsletter,
      };
    }
  }

  return NextResponse.json({
    ok: reason === "ok",
    reason,
    invitedBy: invite.invitedBy,
    expiresAt: invite.expiresAt,
    prefill,
  });
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const { invite, reason } = await loadInvite(params.token);
  if (!invite || reason !== "ok") {
    return NextResponse.json({ ok: false, reason, error: `This invite is ${reason}.` }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Please check the form and try again." }, { status: 400 });
  }
  const data = parsed.data;

  if (!data.consent) {
    return NextResponse.json({ ok: false, error: "You must agree to the data-use terms to create an account." }, { status: 400 });
  }
  if (data.password !== data.confirmPassword) {
    return NextResponse.json({ ok: false, error: "Passwords don't match." }, { status: 400 });
  }
  const email = data.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });
  }
  const gradYear = typeof data.graduationYear === "number"
    ? data.graduationYear
    : parseInt(String(data.graduationYear || ""), 10);
  if (!Number.isFinite(gradYear) || gradYear < 1873 || gradYear > 2099) {
    return NextResponse.json({ ok: false, error: "A valid graduation year is required." }, { status: 400 });
  }

  // Reject if a portal login already exists for this email — prevents
  // duplicate accounts + accidental takeover of an existing login.
  const existingUser = await prisma.portalUser.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { ok: false, error: "An account with this email already exists. Try signing in instead." },
      { status: 409 }
    );
  }

  const profileData = {
    fullName: data.fullName.trim(),
    graduationYear: gradYear,
    preferredName: clean(data.preferredName, 60),
    pledgeClass: clean(data.pledgeClass, 30),
    email,
    phone: clean(data.phone, 30),
    city: clean(data.city, 80),
    state: clean(data.state, 30),
    employer: clean(data.employer, 120),
    jobTitle: clean(data.jobTitle, 120),
    linkedinUrl: clean(data.linkedinUrl, 300),
    bio: clean(data.bio, 500),
    optInDirectory: data.optInDirectory !== false,
    optInNewsletter: data.optInNewsletter !== false,
  };

  // Attach to the bound profile if the invite carried one; else match an
  // existing public profile by email; else create fresh. This keeps a single
  // canonical AlumniProfile per person (no duplicate rows from an HQ import +
  // self-onboard).
  let alumniProfile =
    (invite.alumniId
      ? await prisma.alumniProfile.findUnique({ where: { id: invite.alumniId } })
      : null) ||
    (await prisma.alumniProfile.findFirst({ where: { email } }));

  if (alumniProfile) {
    alumniProfile = await prisma.alumniProfile.update({
      where: { id: alumniProfile.id },
      data: profileData,
    });
  } else {
    alumniProfile = await prisma.alumniProfile.create({ data: profileData });
  }

  const portalUser = await prisma.portalUser.create({
    data: {
      role: "alumni",
      email,
      passwordHash: hashPassword(data.password),
      alumniId: alumniProfile.id,
      lastLoginAt: new Date(),
    },
  });

  // Single-use: burn the invite so a forwarded link can't be replayed.
  await prisma.alumniInvite.update({
    where: { id: invite.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  // Auto-login the new alum.
  setPortalCookie(portalUser.id, "alumni");

  try {
    const actor = actorFromRequest(req, { name: profileData.fullName, role: "alumni" });
    await auditAndNotify("alumni.onboard", {
      actor,
      entity: { type: "AlumniProfile", id: alumniProfile.id, name: profileData.fullName },
      payload: { graduationYear: gradYear, viaInvite: invite.id, optInDirectory: profileData.optInDirectory, optInNewsletter: profileData.optInNewsletter },
    });
  } catch {
    /* ignore audit failures */
  }

  // R47 — fire-and-forget welcome email. Resolves the origin from the
  // request so it works on any deploy domain; never blocks the response,
  // and no-ops gracefully when RESEND isn't configured.
  try {
    const siteUrl =
      process.env.SITE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(req.url).origin;
    const firstName = (profileData.preferredName || profileData.fullName).split(" ")[0] || "brother";
    void sendWelcomeEmail({ to: email, firstName, siteUrl }).catch(() => {});
  } catch {
    /* never let email setup break onboarding */
  }

  return NextResponse.json({
    ok: true,
    user: { id: portalUser.id, email: portalUser.email, role: portalUser.role },
    redirectTo: "/portal/alumni/dashboard",
  });
}
