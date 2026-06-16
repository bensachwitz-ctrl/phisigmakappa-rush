import { NextResponse } from "next/server";
import { centralDb } from "@/lib/prisma";
import { mobileCorsHeaders, mobilePreflightResponse } from "@/lib/mobile-cors";

export const dynamic = "force-dynamic";

// GET /api/mobile/registry
//
// The BUNDLED native app cannot run the SSR /app page (which reads the central
// Tenant registry server-side to build the School→Chapter picker). So the
// bundled client fetches the SAME public registry through this lightweight,
// READ-ONLY, UNAUTHENTICATED endpoint over the platform origin.
//
// It returns ONLY non-sensitive routing fields (id, subdomain, name, school,
// domain) for ACTIVE chapters — exactly the projection app/app/page.tsx already
// exposes to the client picker. No member data, no secrets. CORS-enabled for the
// Capacitor origin (same allow-list as the rest of /api/mobile/*).

export function OPTIONS(req: Request) {
  return mobilePreflightResponse(req.headers.get("origin"));
}

function withCors(req: Request, res: NextResponse): NextResponse {
  const headers = mobileCorsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

export async function GET(req: Request) {
  let chapters: Array<{
    id: string;
    subdomain: string;
    name: string | null;
    school: string | null;
    domain: string | null;
  }> = [];

  try {
    const rows = await centralDb.tenant.findMany({
      where: { isActive: true },
      select: {
        id: true,
        subdomain: true,
        name: true,
        school: true,
        domain: true,
      },
      orderBy: [{ school: "asc" }, { name: "asc" }],
    });
    chapters = rows.filter((r) => !!r.subdomain);
  } catch {
    // Fully defensive: a registry read hiccup yields [] and the bundled client
    // falls back to its built-in demo chapters (mirrors page.tsx behavior).
    chapters = [];
  }

  return withCors(
    req,
    NextResponse.json({ ok: true, chapters }),
  );
}
