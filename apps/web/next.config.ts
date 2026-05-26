import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
  // Prisma and other Node.js-only packages must not be bundled by Next.js
  serverExternalPackages: ["@prisma/client", "@timsan/db", "argon2"],
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
