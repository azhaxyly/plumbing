/**
 * Brand repository — queries for brand list and brand detail pages.
 */

import { prisma } from "../index";

export interface BrandSummary {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  productsCount: number;
}

/** Product data shape for brand listing — matches ProductCardData in the web app */
export interface BrandProductItem {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  primaryImageUrl: string | null;
  primaryImageAlt: string;
  brandName: string | null;
  inStock: boolean;
}

export interface BrandWithProducts {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  products: BrandProductItem[];
}

/**
 * Returns all brands with id, slug, name, logoUrl, and count of active products.
 */
export async function getAllBrands(): Promise<BrandSummary[]> {
  const brands = await prisma.brand.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      products: {
        where: { status: "active" },
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return brands.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    logoUrl: b.logoUrl,
    productsCount: b.products.length,
  }));
}

/**
 * Returns a brand by slug with its active products.
 * Returns null if the brand is not found.
 */
export async function getBrandBySlug(
  slug: string
): Promise<BrandWithProducts | null> {
  const brand = await prisma.brand.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      description: true,
      products: {
        where: { status: "active" },
        select: {
          id: true,
          slug: true,
          name: true,
          priceCents: true,
          compareAtPriceCents: true,
          brand: {
            select: { name: true },
          },
          images: {
            where: { isPrimary: true },
            select: { url: true, alt: true },
            take: 1,
          },
          variants: {
            select: { quantity: true, reserved: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 48,
      },
    },
  });

  if (!brand) return null;

  const products: BrandProductItem[] = brand.products.map((p) => {
    const primaryImage = p.images[0] ?? null;
    const totalAvailable = p.variants.reduce(
      (sum, v) => sum + (v.quantity - v.reserved),
      0
    );

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      priceCents: p.priceCents,
      compareAtPriceCents: p.compareAtPriceCents,
      primaryImageUrl: primaryImage?.url ?? null,
      primaryImageAlt: primaryImage?.alt ?? p.name,
      brandName: p.brand?.name ?? null,
      inStock: totalAvailable > 0,
    };
  });

  return {
    id: brand.id,
    slug: brand.slug,
    name: brand.name,
    logoUrl: brand.logoUrl,
    description: brand.description,
    products,
  };
}
