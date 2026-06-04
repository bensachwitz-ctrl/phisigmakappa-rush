import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPortalSession, isAdminOverride } from "@/lib/portal-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/portal/alumni/profile
 *
 * Alumni self-edit of their own AlumniProfile — the alumni-portal twin of the
 * brothers' /api/portal/brothers/profile route. Mirrors that contract:
 *
 *   • The member is resolved from the SESSION, never the request body. The body
 *     carries only editable field values; the alumniId comes from the portal
 *     cookie (or, for an admin override, the first profile — same resolution the
 *     dashboard page uses). This is the load-bearing security property: an alum
 *     cannot edit anyone else's row by passing a different id.
 *   • zod-validated input; unknown/locked fields (fullName, graduationYear,
 *     pledgeClass, email) are simply not in the schema and can't be touched here.
 *   • Returns the fresh, persisted values so the client can reconcile state.
 *
 * Auth: a valid alumni portal session OR an admin override. Anything else → 401.
 */

// Only the user-editable subset of AlumniProfile. Identity/eligibility fields
// (fullName, graduationYear, pledgeClass, initiationYear, email) are intentionally
// omitted so self-edit can't rewrite them — those are admin/registration-owned.
const UpdateAlumniProfileSchema = z.object({
  preferredName: z.string().max(80).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  state: z.string().max(120).optional().or(z.literal("")),
  employer: z.string().max(160).optional().or(z.literal("")),
  jobTitle: z.string().max(160).optional().or(z.literal("")),
  bio: z.string().max(2000).optional().or(z.literal("")),
  linkedinUrl: z.string().url().max(300).optional().or(z.literal("")),
  optInDirectory: z.boolean().optional(),
  optInNewsletter: z.boolean().optional(),
});

/**
 * Resolve the alumniId for the *current session* — never from the body.
 * Priority mirrors app/portal/alumni/dashboard/page.tsx:
 *   1. The portal user's linked alumniId (the normal alum path).
 *   2. Admin override → the first AlumniProfile in this tenant (so an admin
 *      impersonating the alumni view edits the same row the dashboard shows).
 * Returns null when neither yields a profile (caller maps to 401/404).
 */
async function resolveSessionAlumniId(): Promise<string | null> {
  const sess = getPortalSession();

  if (sess && sess.role === "alumni") {
    const portalUser = await prisma.portalUser.findUnique({
      where: { id: sess.userId },
      select: { alumniId: true },
    });
    if (portalUser?.alumniId) return portalUser.alumniId;
  }

  if (isAdminOverride()) {
    const firstAlumni = await prisma.alumniProfile.findFirst({
      select: { id: true },
    });
    if (firstAlumni?.id) return firstAlumni.id;
  }

  return null;
}

export async function PATCH(req: Request) {
  // Gate: alumni portal session OR admin override. A brother/PNM token, or no
  // token, never gets here.
  const sess = getPortalSession();
  const admin = isAdminOverride();
  if (!(sess && sess.role === "alumni") && !admin) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateAlumniProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input data", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Resolve WHO is being edited from the session, never the body.
  const alumniId = await resolveSessionAlumniId();
  if (!alumniId) {
    return NextResponse.json(
      { error: "No alumni profile is linked to this account." },
      { status: 404 }
    );
  }

  const data = parsed.data;

  // Build the update payload. Strings normalize "" → null (clears the field);
  // booleans pass through only when present so an omitted toggle keeps its value.
  const updateData: Record<string, string | boolean | null | Date> = {
    updatedAt: new Date(),
  };
  if (data.preferredName !== undefined) updateData.preferredName = data.preferredName || null;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.city !== undefined) updateData.city = data.city || null;
  if (data.state !== undefined) updateData.state = data.state || null;
  if (data.employer !== undefined) updateData.employer = data.employer || null;
  if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle || null;
  if (data.bio !== undefined) updateData.bio = data.bio || null;
  if (data.linkedinUrl !== undefined) updateData.linkedinUrl = data.linkedinUrl || null;
  if (data.optInDirectory !== undefined) updateData.optInDirectory = data.optInDirectory;
  if (data.optInNewsletter !== undefined) updateData.optInNewsletter = data.optInNewsletter;

  let updated;
  try {
    updated = await prisma.alumniProfile.update({
      where: { id: alumniId },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        preferredName: true,
        graduationYear: true,
        pledgeClass: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        employer: true,
        jobTitle: true,
        linkedinUrl: true,
        bio: true,
        optInDirectory: true,
        optInNewsletter: true,
      },
    });
  } catch (err) {
    console.error("[alumni profile] update failed:", err);
    return NextResponse.json(
      { error: "Could not save your profile. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, alumni: updated });
}
