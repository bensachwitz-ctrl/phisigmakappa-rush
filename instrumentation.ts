// Next.js instrumentation hook — loads the right Sentry runtime config and
// forwards uncaught Server Component / route-handler errors to Sentry, tagged
// with the chapter tenant resolved from the request host.
//
// Everything here is a no-op unless SENTRY_DSN is set (the configs self-gate),
// so local/dev/CI behavior is unchanged.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Minimal shapes for Next 14's onRequestError args (the `Instrumentation`
// namespace isn't exported from `next` at this version, so we type inline).
type RequestErrorRequest = { headers: Record<string, string | undefined> };
type RequestErrorContext = {
  routerKind?: string;
  routePath?: string;
  routeType?: string;
};

// Captures errors thrown in Server Components, route handlers, middleware, etc.
// Wrapped so it stays inert (and never throws) when Sentry isn't configured.
export async function onRequestError(
  err: unknown,
  request: RequestErrorRequest,
  context: RequestErrorContext,
): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    // Resolve the chapter tenant from the host the request came in on. The
    // x-tenant-host header is injected by middleware.ts; fall back to Host.
    const headers = request.headers || {};
    const host = headers["x-tenant-host"] || headers["host"] || "";
    const tenant = resolveTenant(host);
    Sentry.withScope((scope) => {
      scope.setTag("tenant", tenant);
      scope.setContext("nextjs", {
        routerKind: context.routerKind,
        routePath: context.routePath,
        routeType: context.routeType,
      });
      Sentry.captureException(err);
    });
  } catch {
    // Best-effort — observability must never break a request.
  }
}

const APEX_HOSTS = new Set([
  "localhost",
  "greekstack",
  "greekstack.vercel.app",
  "greeklifesystems.vercel.app",
  "greek-life-systems.vercel.app",
  "www",
]);

function resolveTenant(host: string): string {
  const h = host.split(":")[0].toLowerCase();
  if (!h) return "unknown";
  if (APEX_HOSTS.has(h) || !h.includes(".")) return "platform";
  return h.split(".")[0];
}
