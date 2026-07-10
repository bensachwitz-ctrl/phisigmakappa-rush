import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortalSession, isAdminOverride } from "@/lib/portal-auth";
import { routeEventToRecipients, listPortalRecipients } from "@/lib/notify/prefs";
import { getOfficerPermissionsForBrother } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sess = getPortalSession();
  const admin = isAdminOverride();
  if (!sess && !admin) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = String(body.title || "").trim();
  const company = String(body.company || "").trim();
  const location = body.location ? String(body.location).trim() : null;
  const description = String(body.description || "").trim();
  const requirements = body.requirements ? String(body.requirements).trim() : null;
  const salary = body.salary ? String(body.salary).trim() : null;
  const contactName = String(body.contactName || "").trim();
  const contactEmail = String(body.contactEmail || "").trim();
  const contactPhone = body.contactPhone ? String(body.contactPhone).trim() : null;

  if (!title || !company || !description || !contactName || !contactEmail) {
    return NextResponse.json({ error: "Title, company, description, contactName, and contactEmail are required." }, { status: 400 });
  }

  // Determine publisher details from session
  let postedById = "admin-override";
  let postedByName = "Chapter Admin";
  let postedByRole = "admin";
  // Officer/admin gate for the notify blast (below). A regular member or alumnus
  // may still post a job, but must NOT be able to fan a push to every brother +
  // alumnus — that is a spam/abuse vector. Admin override is always privileged.
  let posterBrotherId: string | null = null;

  if (sess) {
    postedById = sess.userId;
    postedByRole = sess.role; // 'brother' or 'alumni'

    const portalUser = await prisma.portalUser.findUnique({
      where: { id: sess.userId },
    });

    if (portalUser) {
      if (portalUser.role === "brother" && portalUser.brotherId) {
        posterBrotherId = portalUser.brotherId;
        const brother = await prisma.brother.findUnique({ where: { id: portalUser.brotherId } });
        if (brother) postedByName = brother.name;
      } else if (portalUser.role === "alumni" && portalUser.alumniId) {
        const alum = await prisma.alumniProfile.findUnique({ where: { id: portalUser.alumniId } });
        if (alum) postedByName = alum.fullName;
      } else {
        postedByName = portalUser.email;
      }
    }
  }

  // Resolve whether the poster is privileged enough to trigger the chapter-wide
  // notification fan-out: admin override, or a brother holding >=1 active officer
  // assignment. Best-effort — a lookup error means "not privileged" (no blast),
  // never a failed post.
  let mayNotify = admin;
  if (!mayNotify && posterBrotherId) {
    try {
      const perms = await getOfficerPermissionsForBrother(posterBrotherId);
      mayNotify = !!perms.superAdmin || Object.keys(perms.domain || {}).length > 0;
    } catch {
      mayNotify = false;
    }
  }

  try {
    const job = await prisma.jobPosting.create({
      data: {
        title,
        company,
        location,
        description,
        requirements,
        salary,
        contactName,
        contactEmail,
        contactPhone,
        postedById,
        postedByName,
        postedByRole,
      },
    });

    // notify #2 — route the new opportunity to every opted-in member's chosen
    // external channels. Best-effort; never blocks the post on a channel failure.
    // GATED: only an officer/admin post fans out chapter-wide (anti-spam).
    if (mayNotify) {
      const recipients = await listPortalRecipients(["brother", "alumni"]);
      await routeEventToRecipients(
        {
          event: "job.posted",
          title: `New opportunity: ${title}`,
          body: `${company}${location ? ` · ${location}` : ""}`,
          url: "/portal/brothers/dashboard",
        },
        recipients,
      );
    }

    return NextResponse.json({ ok: true, job });
  } catch (err: any) {
    // Log the real cause server-side; NEVER echo err.message (may carry DB /
    // schema internals) back to the portal caller.
    console.error("Error creating job posting:", err);
    return NextResponse.json(
      { error: "Could not create the job posting. Please try again." },
      { status: 500 },
    );
  }
}
