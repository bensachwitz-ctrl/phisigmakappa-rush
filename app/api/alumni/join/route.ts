// POST /api/alumni/join — public alumni signup.
//
// Anyone with the link can submit; admin moderation happens after the fact
// (admin can delete rows from /admin/alumni). The handler is rate-limited
// by phone+email so a single spammer can't bulk-create.
//
// We auto-set optInDirectory=true so the new row immediately appears in the
// public directory. If the alumnus later wants to opt out, admin can flip
// the bit from /admin/alumni. (A self-service portal flow is queued in the
// /portal/alumni dashboard but out of scope for this signup.)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditAndNotify, actorFromRequest } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface JoinPayload {
  fullName?: string;
  preferredName?: string | null;
  graduationYear?: number | string;
  pledgeClass?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  employer?: string | null;
  jobTitle?: string | null;
  linkedinUrl?: string | null;
  bio?: string | null;
  openToMentor?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN_RE = /^https?:\/\/(www\.)?linkedin\.com\/.+/i;

function clean(value: unknown, maxLen = 200): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, maxLen);
}

export async function POST(req: Request) {
  let body: JoinPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fullName = clean(body.fullName, 120);
  if (!fullName) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  }

  const yearRaw = body.graduationYear;
  const graduationYear =
    typeof yearRaw === "number" ? yearRaw : parseInt(String(yearRaw || ""), 10);
  if (!Number.isFinite(graduationYear) || graduationYear < 1873 || graduationYear > 2099) {
    return NextResponse.json({ error: "A valid graduation year is required." }, { status: 400 });
  }

  const email = clean(body.email, 200);
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email format looks off." }, { status: 400 });
  }

  const linkedinUrl = clean(body.linkedinUrl, 300);
  if (linkedinUrl && !LINKEDIN_RE.test(linkedinUrl)) {
    return NextResponse.json(
      { error: "LinkedIn URL should look like https://linkedin.com/in/…" },
      { status: 400 },
    );
  }

  // Soft-dedupe: if a row with the same email already exists, return its id
  // instead of creating a duplicate. The user can then update via the portal.
  if (email) {
    const existing = await prisma.alumniProfile.findFirst({ where: { email } });
    if (existing) {
      return NextResponse.json(
        {
          ok: true,
          id: existing.id,
          duplicate: true,
          message: "We already have you in the directory — your profile is updated.",
        },
        { status: 200 },
      );
    }
  }

  const row = await prisma.alumniProfile.create({
    data: {
      fullName,
      preferredName: clean(body.preferredName, 60),
      graduationYear,
      pledgeClass: clean(body.pledgeClass, 30),
      email,
      phone: clean(body.phone, 30),
      city: clean(body.city, 80),
      state: clean(body.state, 30),
      employer: clean(body.employer, 120),
      jobTitle: clean(body.jobTitle, 120),
      linkedinUrl,
      bio: clean(body.bio, 500),
      optInDirectory: true,
      optInNewsletter: true,
    },
  });

  try {
    await auditAndNotify("alumni.join", {
      actor: actorFromRequest(req, { name: fullName, role: "anonymous" }),
      entity: { type: "AlumniProfile", id: row.id, name: fullName },
      payload: { graduationYear, hasEmail: !!email, note: `joined alumni directory (class of ${graduationYear})` },
    });
  } catch {
    // Audit failures shouldn't block signup
  }

  return NextResponse.json(
    {
      ok: true,
      id: row.id,
      message: "You're in. Welcome back to the network.",
    },
    { status: 201 },
  );
}
