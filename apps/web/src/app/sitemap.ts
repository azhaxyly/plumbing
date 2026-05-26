import { prisma } from "@timsan/db";
import type { MetadataRoute } from "next";

const SITE_URL =
  process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";

function url(path: string): string {
  return `${SITE_URL}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: url("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: url("/brand"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: url("/search"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: url("/about-us"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: url("/delivery-info"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: url("/contacts"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: url("/privacy-policy"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: url("/payment-info"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: url("/returns"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: url("/public-offer"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Categories
  const categories = await prisma.category.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: url(`/category/${cat.slug}`),
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

  return [...staticRoutes, ...categoryRoutes, ...brandRoutes, ...productRoutes];
}
