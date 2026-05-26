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

  const password = clean(body.password, 100);
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const yearRaw = body.graduationYear;
  const graduationYear =
    typeof yearRaw === "number" ? yearRaw : parseInt(String(yearRaw || ""), 10);
  if (!Number.isFinite(graduationYear) || graduationYear < 1873 || graduationYear > 2099) {
    return NextResponse.json({ error: "A valid graduation year is required." }, { status: 400 });
  }

  // Check if PortalUser already exists with this email
  const existingUser = await prisma.portalUser.findUnique({
    where: { email },
  });
  if (existingUser) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
  }

  // Create the AlumniProfile first (or find existing public one by email)
  let alumniProfile = await prisma.alumniProfile.findFirst({
    where: { email },
  });

  const age = body.age ? parseInt(String(body.age), 10) : null;

  if (alumniProfile) {
    // Update existing profile with new registration details
    alumniProfile = await prisma.alumniProfile.update({
      where: { id: alumniProfile.id },
      data: {
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
      },
    });
  } else {
    // Create new profile
    alumniProfile = await prisma.alumniProfile.create({
      data: {
        fullName,
        graduationYear,
        preferredName: clean(body.preferredName, 60),
        pledgeClass: clean(body.pledgeClass, 30),
        email,
        age: age && !isNaN(age) ? age : null,
        major: clean(body.major, 100),
        phone: clean(body.phone, 30),
        city: clean(body.city, 80),
        state: clean(body.state, 30),
        employer: clean(body.employer, 120),
        jobTitle: clean(body.jobTitle, 120),
        linkedinUrl: clean(body.linkedinUrl, 300),
        bio: clean(body.bio, 500),
        optInDirectory: true,
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
      email,
      passwordHash,
      alumniId: alumniProfile.id,
    },
  });

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
      payload: { graduationYear, email },
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
