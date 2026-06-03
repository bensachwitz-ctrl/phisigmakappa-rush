import { NextResponse, type NextRequest } from "next/server";
import { verifyEdgeSession } from "./lib/auth-edge";

const STATE_CHANGING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/**
 * Returns true if the request appears same-origin OR has no Origin/Referer
 * header (curl, server-to-server, Vercel cron). Dynamic for multi-tenancy.
 */
function isSameOriginEdge(req: NextRequest): boolean {
  const host = req.headers.get("host") || "";
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }
  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") || "";

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

  // CSRF check on state-changing API routes
  if (
    STATE_CHANGING_METHODS.has(req.method) &&
    (pathname.startsWith("/api/admin/") ||
      pathname.startsWith("/api/polls/") ||
      pathname.startsWith("/api/polls") ||
      /^\/api\/events\/[^\/]+\/rsvp/.test(pathname))
  ) {
    if (!isSameOriginEdge(req)) {
      return NextResponse.json(
        { ok: false, error: "Cross-origin request blocked" },
        { status: 403 },
      );
    }
  }

  // Inject subdomain header for Server Components/API routes to resolve tenant
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant-host", hostname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - brand/ (brand assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|brand/).*)",
  ],
};
