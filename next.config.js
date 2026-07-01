/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  optimizeFonts: false,
  // Gzip/Brotli the HTML + RSC payload. Vercel compresses at its edge already,
  // but setting this keeps non-Vercel deploys (preview boxes, self-host, custom
  // origins) from shipping uncompressed responses. No-op where the platform
  // already compresses.
  compress: true,
  // Never emit a `X-Powered-By: Next.js` header — trims a header off every
  // response and avoids advertising the framework/version to scanners.
  poweredByHeader: false,
  // Explicit (these are the framework defaults for Next 14, but pinning them
  // documents intent and guards against an accidental override regression like
  // the R44 minifier-disable). swcMinify keeps the SWC minifier on in prod;
  // productionBrowserSourceMaps:false keeps multi-MB *.map files out of the
  // client bundle shipped to chapter members.
  swcMinify: true,
  productionBrowserSourceMaps: false,
  // Strip console.* from PRODUCTION client bundles (keep console.error/warn for
  // real diagnostics). Belt-and-suspenders behind the zero-console bar so a
  // stray console.log in any component never ships to chapter members. No effect
  // in dev, where logs are still useful.
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },
  // next/image is intentionally NOT used on the public pages — chapter photos
  // go through the custom /api/photo proxy (SSRF-hardened, AVIF/WebP transcode,
  // 30-day edge cache) so the existing `<img src="/api/photo/...">` responsive
  // pattern is preserved. This block only governs the built-in next/image
  // optimizer IF a future surface adopts it; it has no effect on the current
  // <img> proxy pattern. Formats + remotePatterns mirror the CSP img-src
  // allowlist so the two stay coherent.
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000, // 30 days — matches the /api/photo edge TTL
    remotePatterns: [
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: '**.vercel-storage.com' },
      // Cloudinary delivery host — used only when Cloudinary is configured
      // (CLOUDINARY_* env set). Inert otherwise: no asset is served from this
      // host unless an upload landed in Cloudinary, so this is purely additive.
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  // R44 — REMOVED the `config.optimization.minimize = false` webpack
  // override that a prior in-progress wave left behind. It disabled JS
  // minification in PRODUCTION builds, which would have shipped the full
  // unminified bundle to chapter members on every page load (multi-MB
  // payloads, slow first paint). Minification is now restored — Next's
  // default Terser/SWC minifier runs in prod as intended. The
  // `workerThreads/cpus` experimental caps are KEPT: they only constrain
  // build-time parallelism (a stability aid on resource-limited machines)
  // and have zero effect on the shipped output.
  experimental: {
    workerThreads: false,
    cpus: 1,
    serverActions: {
      bodySizeLimit: '5mb',
    },
    // Enables instrumentation.ts (Sentry server/edge init + onRequestError
    // tenant-tagged error capture). Inert unless SENTRY_DSN is set — the hook
    // self-gates, so there is no runtime cost when Sentry is unconfigured.
    instrumentationHook: true,
  },
  // Silence the cosmetic "Critical dependency: require function is used in a way
  // in which dependencies cannot be statically extracted" warning emitted by
  // require-in-the-middle (pulled in by @sentry/nextjs's OpenTelemetry
  // instrumentation) during `next build`. It is a known, benign dynamic require
  // inside a dependency and cannot be actioned from app code; this filters only
  // that module's Critical-dependency warning so the build log stays clean (and
  // never hides a real warning from our own code).
  webpack(config) {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /require-in-the-middle/, message: /Critical dependency/ },
      { module: /@opentelemetry\/instrumentation/, message: /Critical dependency/ },
    ];
    return config;
  },
  // Browsers and many crawlers (Slack unfurl, RSS readers, older Safari) hard-
  // code a request for /favicon.ico before reading <link rel="icon"> in HTML.
  // Without this rewrite the request 404s; redirecting to /icon (the App-Router
  // generated PNG icon) gives every client a valid 200.
  async rewrites() {
    return [
      { source: '/favicon.ico', destination: '/icon' },
    ];
  },
  // The marketing landing presents pricing as an on-page section (#pricing),
  // reached via in-page anchors in the nav/footer. But "/pricing" is an obvious
  // URL a prospect (or an App Store listing) may type directly, and it 404'd —
  // so map it to the pricing section of the homepage instead of dead-ending.
  // Temporary (307) so the canonical pricing URL stays the homepage anchor and
  // a real /pricing route can be added later without an entrenched 308 cache.
  async redirects() {
    return [
      { source: '/pricing', destination: '/#pricing', permanent: false },
    ];
  },
  // Security + privacy headers applied to every route. Vercel adds HSTS in
  // front of this in production, but we set the others ourselves.
  async headers() {
    // 'unsafe-eval' is ONLY needed for Next's dev-mode React Refresh / HMR. In
    // production the compiled bundle never eval()s, so we drop it there — a
    // production CSP with 'unsafe-eval' would needlessly widen the XSS surface.
    // 'unsafe-inline' stays for now: Tailwind injects <style> and Next inlines
    // small RSC bootstrap scripts, so removing it would break the app.
    const isProd = process.env.NODE_ENV === "production";
    // PostHog product analytics. Only widen the CSP when a key is actually
    // configured (NEXT_PUBLIC_POSTHOG_KEY). Without it the CSP stays exactly as
    // tight as before. PostHog loads its array/config script from the assets
    // host and beacons events to the ingest host, so both script-src and
    // connect-src need the origins or every capture is CSP-blocked (and the SDK
    // retries in a loop, spamming the console). Declared BEFORE scriptSrc since
    // scriptSrc appends posthogScript. Host defaults to US cloud.
    const posthogEnabled = !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogScript = posthogEnabled ? " https://us-assets.i.posthog.com" : "";
    const posthogConnect = posthogEnabled
      ? " https://us.i.posthog.com https://us-assets.i.posthog.com"
      : "";
    // https://js.stripe.com is required so Stripe.js loads on the signup/checkout
    // funnel (/onboard) and the dues Connect flows — without it the CSP blocks
    // Stripe.js and the payment step silently fails ("Failed to load Stripe.js").
    const scriptSrc = (isProd
      ? "script-src 'self' 'unsafe-inline' https://js.stripe.com"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com")
      + posthogScript;
    // Only widen connect-src to Sentry's ingest host when client error tracking
    // is actually configured. With NEXT_PUBLIC_SENTRY_DSN unset the CSP stays
    // exactly as tight as before — no Sentry origin is allowed.
    const sentryConnect = process.env.NEXT_PUBLIC_SENTRY_DSN
      ? " https://*.sentry.io https://*.ingest.sentry.io"
      : "";
    return [
      // NOTE: the Apple universal-links association file
      // (/.well-known/apple-app-site-association) is now served by a route
      // handler (app/.well-known/apple-app-site-association/route.ts) that reads
      // the team id from APPLE_TEAM_ID and sets its own Content-Type +
      // Cache-Control. The former static-file header override here was removed
      // along with the static public/ file.
      {
        // Brand image assets (chapter logos, coats of arms) are content-hashed
        // by filename — when an asset changes, the chapter ships a new file at
        // a new path. So the cached asset can be considered immutable for a
        // year. Saves a revalidate roundtrip on every page paint.
        source: '/brand/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          // Tightened from R8: locks script-src/style-src/img-src to known
          // origins. 'unsafe-inline' is required because Tailwind injects style
          // tags + Next inlines small RSC scripts. 'unsafe-eval' is added to
          // script-src ONLY in development (see `scriptSrc` above) — production
          // drops it.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob: https://*.cdninstagram.com https://*.fbcdn.net https://*.vercel-storage.com https://res.cloudinary.com",
              "style-src 'self' 'unsafe-inline'",
              scriptSrc,
              "font-src 'self' data:",
              // Stream (chat) origins are allowed so the integration works when
              // its env keys are set. Inert otherwise — no request hits these
              // hosts unless the feature is configured.
              "connect-src 'self' https://api.stripe.com https://api.resend.com https://api.twilio.com https://*.stream-io-api.com https://*.getstream.io wss://*.stream-io-api.com https://cal.com https://*.cal.com" + sentryConnect + posthogConnect,
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.instagram.com https://instagram.com https://*.cdninstagram.com https://cal.com https://*.cal.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join('; '),
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), interest-cohort=()' },
          // HSTS is also set by Vercel; we set it again so non-Vercel deploys
          // (preview environments, custom domains) still get the right header.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

// Wrap with Sentry ONLY when a DSN is configured. withSentryConfig is otherwise
// a passthrough, but gating it keeps the build identical (no Sentry webpack
// plugin, no source-map upload attempt) for the common no-DSN case — important
// because Vercel deploys are the only place the DSN/auth token live. Source-map
// upload additionally requires SENTRY_AUTH_TOKEN + SENTRY_ORG/SENTRY_PROJECT;
// without those it silently skips upload (errors still report, frames are
// minified). `tunnelRoute` proxies browser events through the app origin to
// dodge ad-blockers; safe to leave on.
let finalConfig = nextConfig;
if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { withSentryConfig } = require('@sentry/nextjs');
  finalConfig = withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    // Keep client bundles lean: hide the Sentry SDK logger in production.
    disableLogger: true,
    // Proxy events through /monitoring so ad-blockers don't drop them.
    tunnelRoute: '/monitoring',
    // Only upload source maps when an auth token is present.
    sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  });
}

module.exports = finalConfig;
