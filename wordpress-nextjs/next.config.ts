import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/contact-2",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/privacy-and-cookies-policy",
        destination: "/privacy-policy",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // When the platform serves this path through Next, tell crawlers not to index listings.
        source: "/__static/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  images: {
    // Some local networks (DNS64/NAT64) resolve the feed's image CDN to
    // 64:ff9b:: addresses, which Next treats as private and rejects. Allow it
    // in dev only; production keeps the SSRF guard.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  // Empty turbopack config to silence the warning
  // Turbopack is enabled by default in Next.js 16
  sassOptions: {
    silenceDeprecations: ['legacy-js-api'],
  },
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {},
};

export default nextConfig;
