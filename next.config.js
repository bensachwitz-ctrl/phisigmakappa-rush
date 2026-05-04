/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  // Security + privacy headers applied to every route. Vercel adds HSTS in
  // front of this in production, but we set the others ourselves.
  async headers() {
    return [
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
