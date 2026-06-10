import { prisma } from "@timsan/db";
import type { Prisma, Product, Brand, ProductImage, ProductVariant } from "@timsan/db";
import type { ProductCardData } from "@/components/catalog/product-card";

export type BannerWithProducts = Prisma.BannerGetPayload<{
  include: {
    products: {
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true } };
            brand: true;
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
  children?: { id: string; slug: string; name: string }[];
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
                brand: true,
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
      include: {
        children: {
          select: { id: true, slug: true, name: true },
          take: 5,
          orderBy: { position: "asc" },
        },
      },
    });
    return categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      imageUrl: c.imageUrl ?? null,
      children: c.children,
    }));
  } catch (error) {
    console.error("Failed to fetch root categories:", error);
    return [];
  }
}

function mapToProductCardData(
  product: Product & {
    brand: Brand | null;
    images: ProductImage[];
    variants: Pick<ProductVariant, "quantity" | "reserved">[];
  }
): ProductCardData {
  const totalAvailable = product.variants.reduce(
    (sum, v) => sum + Math.max(0, v.quantity - v.reserved),
    0
  );
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    priceCents: product.priceCents,
    compareAtPriceCents: product.compareAtPriceCents,
    primaryImageUrl: product.images?.[0]?.url ?? null,
    primaryImageAlt: product.images?.[0]?.alt ?? "",
    brandName: product.brand?.name ?? null,
    brandSlug: product.brand?.slug ?? null,
    inStock: totalAvailable > 0,
    imageUrls: product.images.map((img) => img.url),
  };
}

export async function getBestsellers(limit = 20): Promise<ProductCardData[]> {
  try {
    const items = await prisma.bestsellerItem.findMany({
      take: limit,
      orderBy: { position: "asc" },
      where: { product: { status: "active" } },
      include: {
        product: {
          include: {
            images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 4 },
            brand: true,
            variants: { select: { quantity: true, reserved: true } },
          },
        },
      },
    });
    return items.map((item) => mapToProductCardData(item.product));
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
        images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 4 },
        brand: true,
        variants: { select: { quantity: true, reserved: true } },
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
        images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 4 },
        brand: true,
        variants: { select: { quantity: true, reserved: true } },
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

const BRAND_GRID_COLS = 5;

export async function getBrandsWithLogo(): Promise<BrandItem[]> {
  try {
    const brands = await prisma.brand.findMany({
      where: { showInGrid: true },
      orderBy: [{ gridOrder: "asc" }, { name: "asc" }],
    });
    // Trim to complete rows so no empty cells appear in the grid
    const completeCount = Math.floor(brands.length / BRAND_GRID_COLS) * BRAND_GRID_COLS;
    return brands.slice(0, completeCount).map((b) => ({
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
