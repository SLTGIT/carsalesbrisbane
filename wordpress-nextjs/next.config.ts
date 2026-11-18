import type { NextConfig } from "next";
import { readFileSync } from "fs";

/**
 * Which build folder to use. Production deploys (/var/www/deploy-csb.sh) build
 * into whichever of .next-a / .next-b is NOT serving, passing NEXT_DIST_DIR,
 * then write that name to .next-slot and restart. So a failed build never
 * touches the live site. `next start` reads .next-slot; without either (local
 * dev) it is the usual .next.
 */
function buildDir(): string {
  const fromEnv = process.env.NEXT_DIST_DIR?.trim();
  if (fromEnv) return fromEnv;
  try {
    return readFileSync(".next-slot", "utf8").trim() || ".next";
  } catch {
    return ".next";
  }
}

const nextConfig: NextConfig = {
  distDir: buildDir(),
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
