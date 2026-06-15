// Sentry — BROWSER/CLIENT init. Loaded automatically by @sentry/nextjs on the
// client. FULLY INERT unless NEXT_PUBLIC_SENTRY_DSN is set (a SEPARATE public
// DSN from the server one, since the client value is shipped to the browser).
//
// Per-tenant tagging: the chapter subdomain is read from the current hostname so
// every browser-side error is attributed to the right tenant. No PII is sent.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
      ? Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE)
      : 0.1,
    // Session Replay is opt-in (off by default) — privacy-first for a member app.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: process.env.NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR
      ? Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR)
      : 0,
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "development",
    ignoreErrors: [
      "NEXT_REDIRECT",
      "NEXT_NOT_FOUND",
      // Browser extension / network noise that is not actionable.
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications.",
    ],
    enabled: true,
  });

  // Attribute every client error to its chapter tenant (the leftmost subdomain
  // label of the host, e.g. `alpha` from `alpha.greekstack.vercel.app`). The
  // apex/marketing host has no chapter label → tag it `platform`.
  try {
    const host = window.location.hostname;
    const APEX_HOSTS = new Set([
      "localhost",
      "greekstack",
      "greekstack.vercel.app",
      "greeklifesystems.vercel.app",
      "greek-life-systems.vercel.app",
      "www",
    ]);
    const isApex = APEX_HOSTS.has(host) || !host.includes(".");
    const tenant = isApex ? "platform" : host.split(".")[0];
    Sentry.setTag("tenant", tenant);
  } catch {
    // window unavailable (SSR import edge case) — tagging is best-effort.
  }
}
