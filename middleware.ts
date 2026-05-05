import { NextResponse, type NextRequest } from "next/server";
import { verifyEdgeSession } from "./lib/auth-edge";

const STATE_CHANGING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/**
 * Returns true if the request appears same-origin OR has no Origin/Referer
 * header (curl, server-to-server, Vercel cron). Used as a CSRF check on
 * authenticated state-changing routes — defense-in-depth on top of the
 * SameSite=Lax cookie.
 */
function isSameOriginEdge(req: NextRequest): boolean {
  const expected = process.env.NEXT_PUBLIC_SITE_URL || "https://phisigmakappa.vercel.app";
  let expectedHost: string;
  try {
    expectedHost = new URL(expected).host;
  } catch {
    return true;
  }
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === expectedHost;
    } catch {
      return false;
    }
  }
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === expectedHost;
    } catch {
      return false;
    }
  }
  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Page-level admin gate — redirect unauthenticated requests to /admin/login.
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = req.cookies.get("phisig_admin")?.value;
    const ok = await verifyEdgeSession(token);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  // CSRF check on state-changing API routes that mutate via the admin
  // session cookie. SameSite=Lax cookies block cross-site XHR but a
  // top-level form POST or Chromium's Lax+POST 2-min grace window can
  // still send the cookie. Origin/Referer must point at our own host.
  // GET/HEAD/OPTIONS skipped (read-only or preflight).
  if (
    STATE_CHANGING_METHODS.has(req.method) &&
    (pathname.startsWith("/api/admin/") ||
      pathname.startsWith("/api/polls/") ||
      pathname.startsWith("/api/polls") ||
      // Brother-RSVP endpoints under /api/events/<id>/rsvp
      /^\/api\/events\/[^\/]+\/rsvp/.test(pathname))
  ) {
    if (!isSameOriginEdge(req)) {
      return NextResponse.json(
        { ok: false, error: "Cross-origin request blocked" },
        { status: 403 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/polls/:path*",
    "/api/events/:path*",
  ],
};
