import { prisma } from "@timsan/db";
import type { Prisma, Product, Brand, ProductImage } from "@timsan/db";
import type { ProductCardData } from "@/components/catalog/product-card";

export type BannerWithProducts = Prisma.BannerGetPayload<{
  include: {
    products: {
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true } };
          };
        };
      };
    };
  };
}>;

export interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string | null;
}

export interface BrandItem {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
}

export async function getActiveBanners(): Promise<BannerWithProducts[]> {
  try {
    const now = new Date();
    const banners = await prisma.banner.findMany({
      where: {
        isActive: true,
        OR: [
          { startsAt: null, endsAt: null },
          { startsAt: { lte: now }, endsAt: null },
          { startsAt: null, endsAt: { gte: now } },
          { startsAt: { lte: now }, endsAt: { gte: now } },
        ],
      },
      include: {
        products: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true } },
              },
            },
          },
        },
      },
      orderBy: { position: "asc" },
    });
    return banners;
  } catch (error) {
    console.error("Failed to fetch active banners:", error);
    return [];
  }
}

export async function getRootCategories(limit = 12): Promise<CategoryItem[]> {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      take: limit,
      orderBy: { position: "asc" },
    });
    return categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      imageUrl: null, // Category model doesn't have an image in schema
    }));
  } catch (error) {
    console.error("Failed to fetch root categories:", error);
    return [];
  }
}

function mapToProductCardData(
  product: Product & { brand: Brand | null; images: ProductImage[] }
): ProductCardData {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    priceCents: product.priceCents,
    compareAtPriceCents: product.compareAtPriceCents,
    primaryImageUrl: product.images?.[0]?.url ?? null,
    primaryImageAlt: product.images?.[0]?.alt ?? "",
    brandName: product.brand?.name ?? null,
    inStock: true, // Assumed true for simplicity or fetch variants
  };
}

export async function getBestsellers(limit = 20): Promise<ProductCardData[]> {
  try {
    const products = await prisma.product.findMany({
      where: { status: "active", isFeatured: true },
      include: {
        images: { where: { isPrimary: true } },
        brand: true,
      },
      take: limit,
    });
    return products.map(mapToProductCardData);
  } catch (error) {
    console.error("Failed to fetch bestsellers:", error);
    return [];
  }
}

export async function getNewArrivals(limit = 20): Promise<ProductCardData[]> {
  try {
    const products = await prisma.product.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      include: {
        images: { where: { isPrimary: true } },
        brand: true,
      },
      take: limit,
    });
    return products.map(mapToProductCardData);
  } catch (error) {
    console.error("Failed to fetch new arrivals:", error);
    return [];
  }
}

export async function getSaleProducts(limit = 20): Promise<ProductCardData[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: "active",
        compareAtPriceCents: { not: null },
      },
      include: {
        images: { where: { isPrimary: true } },
        brand: true,
      },
    });
    const saleProducts = products.filter(
      (p) => p.compareAtPriceCents && p.compareAtPriceCents > p.priceCents
    );
    return saleProducts.slice(0, limit).map(mapToProductCardData);
  } catch (error) {
    console.error("Failed to fetch sale products:", error);
    return [];
  }
}

export async function getBrandsWithLogo(): Promise<BrandItem[]> {
  try {
    const brands = await prisma.brand.findMany({
      where: { logoUrl: { not: null } },
      orderBy: { name: "asc" },
    });
    return brands.map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      logoUrl: b.logoUrl,
    }));
  } catch (error) {
    console.error("Failed to fetch brands with logo:", error);
    return [];
  }
}
