/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Allow Instagram embeds + general iframe content
          {
            key: 'Content-Security-Policy',
            value:
              "frame-src 'self' https://www.instagram.com https://instagram.com https://*.cdninstagram.com;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
