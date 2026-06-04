"use client";

import * as React from "react";

/**
 * ROOT-layout error boundary. Catches errors thrown by `app/layout.tsx` itself
 * (config/header reads, the ChapterIdentityProvider, the theme <style> block) —
 * failures that `app/error.tsx` can never see because it renders *inside* the
 * root layout that just crashed.
 *
 * Because the root layout failed, NOTHING it provides is guaranteed: no
 * ChapterIdentityProvider context (so <Wordmark> would throw), no `cfg`-driven
 * --brand-primary CSS vars, possibly no stylesheet. So this file is deliberately
 * dependency-light: it renders its own <html><body> (a Next requirement for
 * global-error), uses only inline styles, and inlines a self-contained brand
 * shield SVG. The brand color falls back to the documented cardinal default
 * (#C8102E) since the per-tenant --brand-primary may never have been injected.
 *
 * Reduced-motion: the lone spinner respects the user's OS setting via a JS
 * media-query check (we can't rely on globals.css's reduce block being loaded),
 * so motion-sensitive users get a static glyph instead of a pulse.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Last-resort surface — the app shell itself failed. In production this
    // would forward to Sentry/Logtail; here we at least leave a console trail.
    // eslint-disable-next-line no-console
    console.error("Root-layout error boundary (global-error) caught:", error);
  }, [error]);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Brand fallback — the per-tenant hex lives in a <style> the (failed) root
  // layout injects, so we can't depend on it. Cardinal red is the documented
  // platform default.
  const brand = "#C8102E";
  const brandDark = "#A20D26";
  const ink = "#0B0B0C";
  const muted = "#5B5B61";

  return (
    <html lang="en">
      <head>
        <title>Something went wrong</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex,nofollow" />
        {/* Scoped keyframes — global-error has no guaranteed stylesheet, so the
            soft fade-in and (reduced-motion-gated) pulse are defined inline. */}
        <style
          dangerouslySetInnerHTML={{
            __html:
              "@keyframes ge-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}" +
              "@keyframes ge-pulse{0%,100%{opacity:1}50%{opacity:.55}}" +
              "@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}",
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          boxSizing: "border-box",
          background:
            "radial-gradient(120% 120% at 50% 0%, #FFFFFF 0%, #FCEFF1 55%, #F7F7F8 100%)",
          color: ink,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          textAlign: "center",
          lineHeight: 1.5,
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <main
          role="main"
          style={{
            width: "100%",
            maxWidth: "30rem",
            animation: prefersReducedMotion ? "none" : "ge-fade .5s ease-out both",
          }}
        >
          {/* Self-contained brand shield — no external font/context needed. */}
          <div
            aria-hidden="true"
            style={{
              margin: "0 auto 20px",
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: prefersReducedMotion ? "none" : "ge-pulse 2.4s ease-in-out infinite",
            }}
          >
            <svg width="56" height="56" viewBox="0 0 40 44" fill="none" role="img" aria-label="">
              <defs>
                <linearGradient id="ge-shield" x1="0" y1="0" x2="40" y2="44" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor={brand} />
                  <stop offset="1" stopColor={brandDark} />
                </linearGradient>
              </defs>
              <path
                d="M20 2 L37 7 L37 24 C37 33 29 39 20 42 C11 39 3 33 3 24 L3 7 Z"
                fill="url(#ge-shield)"
                stroke="#FFFFFF"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M14 22 l4 4 8 -9"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />
            </svg>
          </div>

          <p
            style={{
              margin: "0 0 12px",
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 999,
              border: `1px solid ${brand}33`,
              background: "#FCEFF1",
              color: brandDark,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Something went wrong
          </p>

          <h1
            style={{
              margin: "0 0 10px",
              fontSize: "1.6rem",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              textWrap: "balance",
            }}
          >
            We couldn&apos;t load the app.
          </h1>

          <p style={{ margin: "0 auto 28px", maxWidth: "24rem", color: muted, fontSize: "0.95rem" }}>
            A core part of the site failed to start. This isn&apos;t your fault — try
            reloading, and if it keeps happening, the chapter has been notified.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 44,
                padding: "0 20px",
                borderRadius: 10,
                border: "none",
                background: brand,
                color: "#FFFFFF",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = brandDark;
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = brand;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = brand;
              }}
            >
              {/* Refresh glyph */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3 12a9 9 0 1 0 2.64-6.36M3 4v5h5"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Try again
            </button>

            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 44,
                padding: "0 20px",
                borderRadius: 10,
                border: `1px solid ${ink}22`,
                background: "rgba(255,255,255,0.7)",
                color: ink,
                fontSize: "0.9rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {/* Home glyph */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"
                  stroke={ink}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Go home
            </a>
          </div>

          {error?.digest ? (
            <p style={{ marginTop: 28, fontSize: 10, color: muted, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
