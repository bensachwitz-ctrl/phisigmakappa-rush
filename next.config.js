/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  optimizeFonts: false,
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
  // Security + privacy headers applied to every route. Vercel adds HSTS in
  // front of this in production, but we set the others ourselves.
  async headers() {
    return [
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
          // tags + Next inlines small RSC scripts; 'unsafe-eval' is needed for
          // Next's dev refresh in development (no-op in production).
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob: https://*.cdninstagram.com https://*.fbcdn.net https://*.vercel-storage.com",
              "style-src 'self' 'unsafe-inline'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "font-src 'self' data:",
              "connect-src 'self' https://api.resend.com https://api.twilio.com",
              "frame-src 'self' https://www.instagram.com https://instagram.com https://*.cdninstagram.com",
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
