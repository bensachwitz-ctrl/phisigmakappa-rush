import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortalSession, isAdminOverride } from "@/lib/portal-auth";

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

  if (sess) {
    postedById = sess.userId;
    postedByRole = sess.role; // 'brother' or 'alumni'
    
    const portalUser = await prisma.portalUser.findUnique({
      where: { id: sess.userId },
    });
    
    if (portalUser) {
      if (portalUser.role === "brother" && portalUser.brotherId) {
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

    return NextResponse.json({ ok: true, job });
  } catch (err: any) {
    console.error("Error creating job posting:", err);
    return NextResponse.json({ error: `Database error: ${err.message}` }, { status: 550 });
  }
}
