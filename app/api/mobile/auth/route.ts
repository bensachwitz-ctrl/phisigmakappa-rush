import { NextResponse } from "next/server";
import { centralDb, getTenantClient } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { signPortalToken, setPortalCookie } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const subdomain = String(body.subdomain || "").trim().toLowerCase();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "").trim();
  const role = String(body.role || "").trim().toLowerCase() as "brother" | "alumni";

  if (!subdomain || !email || !password || !role) {
    return NextResponse.json({ error: "Subdomain, email, password, and role are required." }, { status: 400 });
  }

  if (role !== "brother" && role !== "alumni") {
    return NextResponse.json({ error: "Role must be either 'brother' or 'alumni'." }, { status: 400 });
  }

  // 1. Verify that tenant is active in central registry
  const tenant = await centralDb.tenant.findUnique({
    where: { subdomain },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Chapter subdomain not found." }, { status: 404 });
  }

  if (!tenant.isActive) {
    return NextResponse.json({ error: "This chapter is not active." }, { status: 403 });
  }

  // 2. Get the tenant client
  const db = getTenantClient(subdomain);

  let portalUser = null;
  let brotherId = null;

  try {
    if (role === "brother") {
      // Look up portal user
      portalUser = await db.portalUser.findFirst({
        where: { email, role: "brother" },
      });

      brotherId = portalUser?.brotherId;

      // Fallback to Brother record if portal user not provisioned yet
      if (!portalUser) {
        const brother = await db.brother.findFirst({
          where: {
            email: { equals: email, mode: "insensitive" },
            passwordHash: { not: null },
          },
        });

        if (brother && brother.passwordHash && verifyPassword(password, brother.passwordHash)) {
          portalUser = await db.portalUser.create({
            data: {
              role: "brother",
              email,
              passwordHash: brother.passwordHash,
              brotherId: brother.id,
              lastLoginAt: new Date(),
            },
          });
          brotherId = brother.id;
        }
      } else if (portalUser.passwordHash && verifyPassword(password, portalUser.passwordHash)) {
        await db.portalUser.update({
          where: { id: portalUser.id },
          data: { lastLoginAt: new Date() },
        });
      }
    } else {
      // Alumni login
      portalUser = await db.portalUser.findFirst({
        where: { email, role: "alumni" },
      });

      if (portalUser && portalUser.passwordHash && verifyPassword(password, portalUser.passwordHash)) {
        await db.portalUser.update({
          where: { id: portalUser.id },
          data: { lastLoginAt: new Date() },
        });
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Database error: ${err.message}` }, { status: 500 });
  }

  if (!portalUser) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Generate mobile portal token (signed in apex context)
  const token = signPortalToken(portalUser.id, role);

  // Set the portal cookie
  setPortalCookie(portalUser.id, role);

  return NextResponse.json({
    ok: true,
    token,
    user: {
      id: portalUser.id,
      email: portalUser.email,
      role: portalUser.role,
      brotherId,
      subdomain,
      chapterName: tenant.name || subdomain,
      schoolName: tenant.school || "",
    },
  });
}
