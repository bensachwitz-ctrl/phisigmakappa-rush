import { NextResponse } from "next/server";
import { centralDb, getTenantClient } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { signPortalTokenForTenant } from "@/lib/portal-auth";

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

  let portalUser: any = null;
  let brotherId: any = null;
  let authenticated = false; // fail-closed: only a SUCCESSFUL password verify flips this true

  try {
    if (role === "brother") {
      portalUser = await db.portalUser.findFirst({
        where: { email, role: "brother" },
      });

      if (portalUser) {
        // Existing portal user → REQUIRE a matching password. (Previously a failed
        // verifyPassword fell through and still minted a token — an auth bypass.)
        if (portalUser.passwordHash && verifyPassword(password, portalUser.passwordHash)) {
          authenticated = true;
          brotherId = portalUser.brotherId ?? null;
          await db.portalUser.update({
            where: { id: portalUser.id },
            data: { lastLoginAt: new Date() },
          });
        } else {
          portalUser = null; // bad password → fall through to 401 below
        }
      } else {
        // First login: provision a portal user from a Brother record ONLY if the
        // password matches that brother's hash.
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
          authenticated = true;
        }
      }
    } else {
      // Alumni login
      portalUser = await db.portalUser.findFirst({
        where: { email, role: "alumni" },
      });

      if (portalUser) {
        if (portalUser.passwordHash && verifyPassword(password, portalUser.passwordHash)) {
          authenticated = true;
          await db.portalUser.update({
            where: { id: portalUser.id },
            data: { lastLoginAt: new Date() },
          });
        } else {
          portalUser = null; // bad password → 401 below
        }
      }
    }
  } catch (err: any) {
    console.error("[mobile/auth] DB error:", err);
    return NextResponse.json(
      { error: "Unable to sign in right now. Please try again." },
      { status: 500 }
    );
  }

  if (!authenticated || !portalUser) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Tenant-bound token: signed with the chapter's per-tenant secret so it only
  // verifies when this same `subdomain` is presented — never reusable on another
  // chapter. The native app stores + sends this as a Bearer token (no apex cookie).
  const token = signPortalTokenForTenant(portalUser.id, role, subdomain);

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
