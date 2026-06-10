/**
 * Brand repository — queries for brand list and brand detail pages.
 */

import { prisma } from "../index";

export interface BrandCategoryItem {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  children: { id: string; slug: string; name: string }[];
}

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
  brandSlug: string | null;
  inStock: boolean;
}

export interface BrandWithProducts {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
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
 * Returns root categories that contain at least one active product of the given brand.
 */
export async function getBrandCategories(brandId: string): Promise<BrandCategoryItem[]> {
  const categories = await prisma.category.findMany({
    where: {
      parentId: null,
      products: {
        some: {
          product: { brandId, status: "active" },
        },
      },
    },
    orderBy: { position: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      imageUrl: true,
      children: {
        select: { id: true, slug: true, name: true },
        take: 5,
        orderBy: { position: "asc" },
      },
    },
  });
  return categories;
}

type BrandSortValue = "newest" | "price_asc" | "price_desc" | "name_asc";

function getBrandSortOrderBy(sort: BrandSortValue) {
  switch (sort) {
    case "price_asc": return { priceCents: "asc" as const };
    case "price_desc": return { priceCents: "desc" as const };
    case "name_asc": return { name: "asc" as const };
    default: return { createdAt: "desc" as const };
  }
}

export interface BrandProductsOptions {
  brandId: string;
  priceMin?: number;
  priceMax?: number;
  attributeFilters?: Record<string, string[]>;
  sort?: BrandSortValue;
  page?: number;
  pageSize?: number;
}

/**
 * Returns paginated and filtered products for a brand along with the total count.
 */
export async function getBrandProductsPage(
  opts: BrandProductsOptions,
): Promise<{ products: BrandProductItem[]; totalCount: number }> {
  const { brandId, sort = "newest", page = 1, pageSize = 48, priceMin, priceMax, attributeFilters = {} } = opts;

  const priceFilter: { gte?: number; lte?: number } = {};
  if (priceMin !== undefined) priceFilter.gte = priceMin;
  if (priceMax !== undefined) priceFilter.lte = priceMax;

  const attrEntries = Object.entries(attributeFilters).filter(([, vals]) => vals.length > 0);
  const attributeWhere =
    attrEntries.length > 0
      ? {
          AND: attrEntries.map(([attrSlug, valueSlugs]) => ({
            productAttributes: {
              some: {
                attribute: { slug: attrSlug },
                attributeValue: { slug: { in: valueSlugs } },
              },
            },
          })),
        }
      : {};

  const where = {
    status: "active" as const,
    brandId,
    ...(Object.keys(priceFilter).length > 0 ? { priceCents: priceFilter } : {}),
    ...attributeWhere,
  };

  const [rawProducts, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        priceCents: true,
        compareAtPriceCents: true,
        brand: { select: { name: true, slug: true } },
        images: {
          where: { isPrimary: true },
          select: { url: true, alt: true },
          take: 1,
        },
        variants: { select: { quantity: true, reserved: true } },
      },
      orderBy: getBrandSortOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  const products: BrandProductItem[] = rawProducts.map((p) => {
    const primaryImage = p.images[0] ?? null;
    const totalAvailable = p.variants.reduce((sum, v) => sum + (v.quantity - v.reserved), 0);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      priceCents: p.priceCents,
      compareAtPriceCents: p.compareAtPriceCents,
      primaryImageUrl: primaryImage?.url ?? null,
      primaryImageAlt: primaryImage?.alt ?? p.name,
      brandName: p.brand?.name ?? null,
      brandSlug: p.brand?.slug ?? null,
      inStock: totalAvailable > 0,
    };
  });

  return { products, totalCount };
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
      coverImageUrl: true,
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
            select: { name: true, slug: true },
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
      brandSlug: p.brand?.slug ?? null,
      inStock: totalAvailable > 0,
    };
  });

  return {
    id: brand.id,
    slug: brand.slug,
    name: brand.name,
    logoUrl: brand.logoUrl,
    coverImageUrl: brand.coverImageUrl,
    description: brand.description,
    products,
  };
}
