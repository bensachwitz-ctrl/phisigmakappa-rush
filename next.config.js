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
    const scriptSrc = isProd
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
    return [
      {
        // Apple universal-links association file. Lives at
        // public/.well-known/apple-app-site-association with NO .json extension
        // (Apple fetches it by that exact path). Because it has no extension,
        // the static handler would serve it as application/octet-stream and iOS
        // would reject it — so we force application/json here. iOS reads it over
        // HTTPS at the apex (greekstack.vercel.app) + the custom domains declared
        // in App.entitlements. Short cache so a TEAMID/paths edit propagates.
        source: '/.well-known/apple-app-site-association',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
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
              // Stream (chat) + Clerk (auth) origins are allowed so those
              // integrations work when their env keys are set. Inert otherwise —
              // no request hits these hosts unless the feature is configured.
              "connect-src 'self' https://api.resend.com https://api.twilio.com https://*.stream-io-api.com https://*.getstream.io wss://*.stream-io-api.com https://*.clerk.accounts.dev https://*.clerk.com https://cal.com https://*.cal.com",
              "frame-src 'self' https://www.instagram.com https://instagram.com https://*.cdninstagram.com https://*.clerk.accounts.dev https://*.clerk.com https://cal.com https://*.cal.com",
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

module.exports = nextConfig;
