// Sentry — SERVER runtime init (Node.js). Loaded by instrumentation.ts.
//
// FULLY INERT unless SENTRY_DSN is set. With no DSN, Sentry.init() is never
// called, so there is zero overhead and zero network egress in local/dev/CI —
// the DSN lives only in Vercel. This keeps the N-tenant SaaS observable in
// production (per-tenant error tracking) without changing local behavior.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Conservative defaults; the platform operator can dial these up via env.
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
      ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
      : 0.1,
    // Tag the deployment so multi-env (preview vs prod) issues don't comingle.
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    // Drop noisy/expected control-flow errors before they leave the process.
    ignoreErrors: [
      // Next.js redirect()/notFound() throw sentinels by design — not bugs.
      "NEXT_REDIRECT",
      "NEXT_NOT_FOUND",
    ],
    enabled: true,
  });
}
