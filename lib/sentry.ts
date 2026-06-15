// Sentry CLIENT init. The browser SDK is LAZY-LOADED via dynamic import only
// when a DSN is configured, so the (common) unconfigured tenant never pulls
// @sentry/nextjs into the shared root-layout chunk shipped to every page.
// (Server/edge Sentry is wired separately in instrumentation.ts.)

export async function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || (typeof window !== "undefined" ? (window as any).gs_sentry_dsn : undefined);
  if (!dsn) {
    // Silent no-op when unconfigured — the keyless path must not log on every
    // cold boot (zero-console GOTY bar) and never loads the SDK.
    return;
  }

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
  });
}
