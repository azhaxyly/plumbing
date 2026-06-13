import { getAllCategoryPaths, prisma } from "@timsan/db";
import type { MetadataRoute } from "next";

const SITE_URL =
  process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";

function url(path: string): string {
  return `${SITE_URL}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages. No `lastModified` for `/` and `/brand`: a perpetually-"now"
  // timestamp is a junk signal — omitting it is more honest than faking freshness.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/brand"), changeFrequency: "weekly", priority: 0.7 },
  ];

  // CMS pages (about-us, delivery-info, contacts, …) — real updatedAt from DB.
  const cmsPages = await prisma.cmsPage.findMany({
    where: { isPublished: true },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  const cmsRoutes: MetadataRoute.Sitemap = cmsPages.map((p) => ({
    url: url(`/${p.slug}`),
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  // Categories — single entry each at its canonical full path.
  const categoryPaths = await getAllCategoryPaths();
  const categoryRoutes: MetadataRoute.Sitemap = categoryPaths.map((cat) => ({
    url: url(`/category/${cat.path}`),
    lastModified: cat.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Brands
  const brands = await prisma.brand.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  const brandRoutes: MetadataRoute.Sitemap = brands.map((brand) => ({
    url: url(`/brand/${brand.slug}`),
    lastModified: brand.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Active products
  const products = await prisma.product.findMany({
    where: { status: "active" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: url(`/product/${p.slug}`),
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  return [...staticRoutes, ...cmsRoutes, ...categoryRoutes, ...brandRoutes, ...productRoutes];
}
