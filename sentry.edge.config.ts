// Sentry — EDGE runtime init (middleware + edge routes). Loaded by
// instrumentation.ts. FULLY INERT unless SENTRY_DSN is set (see server config).
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
      ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
      : 0.1,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    ignoreErrors: ["NEXT_REDIRECT", "NEXT_NOT_FOUND"],
    enabled: true,
  });
}
