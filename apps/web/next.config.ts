import type { NextConfig } from "next";

// Derive the production image host from S3_PUBLIC_URL (single source of truth,
// e.g. https://cdn.example.kz/media). In dev this is the localhost:9000 entry
// below; in prod next/image must whitelist the CDN subdomain or uploaded
// images get blocked.
const prodImagePattern = (() => {
  const url = process.env.S3_PUBLIC_URL;
  if (!url) return null;
  try {
    const { protocol, hostname, port } = new URL(url);
    if (hostname === "localhost") return null; // already covered below
    return {
      protocol: protocol.replace(":", "") as "http" | "https",
      hostname,
      ...(port ? { port } : {}),
      pathname: "/media/**",
    };
  } catch {
    return null;
  }
})();

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
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
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
      // Self-hosted MinIO on any HTTP host (VPS direct IP or internal hostname).
      // Covers the case where S3_PUBLIC_URL wasn't available at build time.
      {
        protocol: "http",
        hostname: "**",
        port: "9000",
        pathname: "/media/**",
      },
      // Production CDN host (cdn.<домен>), derived from S3_PUBLIC_URL.
      ...(prodImagePattern ? [prodImagePattern] : []),
    ],
  },
  transpilePackages: ["@timsan/ui", "@timsan/shared", "@timsan/domain", "@timsan/search"],
};

export default nextConfig;
