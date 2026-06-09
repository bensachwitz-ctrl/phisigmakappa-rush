import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTenantClient, centralDb } from "@/lib/prisma";
import { verifyPortalToken } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const subdomain = String(body.subdomain || "").trim().toLowerCase();
  const title = String(body.title || "").trim();
  const company = String(body.company || "").trim();
  const location = body.location ? String(body.location).trim() : null;
  const description = String(body.description || "").trim();
  const requirements = body.requirements ? String(body.requirements).trim() : null;
  const salary = body.salary ? String(body.salary).trim() : null;
  const contactName = String(body.contactName || "").trim();
  const contactEmail = String(body.contactEmail || "").trim();
  const contactPhone = body.contactPhone ? String(body.contactPhone).trim() : null;

  if (!subdomain || !title || !company || !description || !contactName || !contactEmail) {
    return NextResponse.json({ error: "subdomain, title, company, description, contactName, and contactEmail are required." }, { status: 400 });
  }

  // 1. Verify tenant in central database
  const tenant = await centralDb.tenant.findUnique({
    where: { subdomain },
  });

  if (!tenant || !tenant.isActive) {
    return NextResponse.json({ error: "Active chapter not found." }, { status: 404 });
  }

  // 2. Extract and verify portal token
  const authHeader = req.headers.get("authorization");
  let token = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else {
    token = cookies().get("phisig_portal")?.value || "";
  }

  if (!token) {
    return NextResponse.json({ error: "Authentication token is required." }, { status: 401 });
  }

  const sess = verifyPortalToken(token);
  if (!sess) {
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  // 3. Resolve tenant DB and user profile
  const db = getTenantClient(subdomain);
  const portalUser = await db.portalUser.findUnique({
    where: { id: sess.userId },
  });

  if (!portalUser) {
    return NextResponse.json({ error: "User profile not found in this chapter." }, { status: 404 });
  }

  // Determine publisher details
  let postedByName = portalUser.email;
  if (portalUser.role === "brother" && portalUser.brotherId) {
    const brother = await db.brother.findUnique({ where: { id: portalUser.brotherId } });
    if (brother) postedByName = brother.name;
  } else if (portalUser.role === "alumni" && portalUser.alumniId) {
    const alum = await db.alumniProfile.findUnique({ where: { id: portalUser.alumniId } });
    if (alum) postedByName = alum.fullName;
  }

  try {
    // 4. Create the Job Posting inside the tenant schema
    const job = await db.jobPosting.create({
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
        postedById: portalUser.id,
        postedByName,
        postedByRole: portalUser.role,
      },
    });

    return NextResponse.json({ ok: true, job });
  } catch (err: any) {
    console.error("Error creating job posting:", err);
    return NextResponse.json({ error: `Database error: ${err.message}` }, { status: 500 });
  }
}
