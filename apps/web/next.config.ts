import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained build for Docker/production deploys.
  output: "standalone",
  experimental: {
    typedRoutes: true,
  },
  // Prisma and other Node.js-only packages must not be bundled by Next.js
  serverExternalPackages: ["@prisma/client", "@timsan/db", "argon2"],
  async headers() {
    return [
      // Security headers on every response.
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // Long-lived caching for static assets served from /public.
      // (Next already sets immutable on /_next/static itself — not duplicated here.)
      {
        source: "/:path*.(png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/media/**",
      },
      // Placeholder images used in seed data (dev only)
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
  transpilePackages: [
    "@timsan/ui",
    "@timsan/shared",
    "@timsan/domain",
    "@timsan/search",
  ],
};

export default nextConfig;
