import * as Sentry from "@sentry/nextjs";

export function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || (typeof window !== "undefined" ? (window as any).gs_sentry_dsn : undefined);
  if (!dsn) {
    console.log("[Sentry] No DSN provided, skipping initialization.");
    return;
  }

  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
  });
  console.log("[Sentry] Initialized successfully.");
}
