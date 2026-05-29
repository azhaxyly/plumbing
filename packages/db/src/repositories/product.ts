/**
 * Product repository — queries for product detail pages.
 */

import { prisma } from "../index";

export interface ProductFull {
  id: string;
  slug: string;
  name: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  createdAt: Date;
  updatedAt: Date;
  brand: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
  } | null;
  images: {
    id: string;
    url: string;
    alt: string;
    position: number;
    isPrimary: boolean;
  }[];
  variants: {
    id: string;
    sku: string;
    priceCents: number;
    quantity: number;
    reserved: number;
    attributes: Record<string, unknown>;
  }[];
  categories: {
    category: {
      id: string;
      slug: string;
      name: string;
      parentId: string | null;
    };
  }[];
  productAttributes: {
    attribute: { name: string };
    attributeValue: { value: string };
  }[];
}

/**
 * Fetches full product data by slug, including variants, images, brand, and categories.
 * Returns null if the product is not found or not active.
 */
export async function getProductBySlug(
  slug: string
): Promise<ProductFull | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      sku: true,
      shortDescription: true,
      description: true,
      priceCents: true,
      compareAtPriceCents: true,
      status: true,
      seoTitle: true,
      seoDescription: true,
      seoKeywords: true,
      createdAt: true,
      updatedAt: true,
      brand: {
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
        },
      },
      images: {
        select: {
          id: true,
          url: true,
          alt: true,
          position: true,
          isPrimary: true,
        },
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
      },
      variants: {
        select: {
          id: true,
          sku: true,
          priceCents: true,
          quantity: true,
          reserved: true,
          attributes: true,
        },
        orderBy: { priceCents: "asc" },
      },
      categories: {
        select: {
          category: {
            select: {
              id: true,
              slug: true,
              name: true,
              parentId: true,
            },
          },
        },
      },
      productAttributes: {
        select: {
          attribute: { select: { name: true } },
          attributeValue: { select: { value: true } },
        },
        orderBy: { attribute: { name: "asc" } },
      },
    },
  });

  if (!product) return null;

  // Cast attributes JSON to the expected type
  return {
    ...product,
    variants: product.variants.map((v) => ({
      ...v,
      attributes: (v.attributes as Record<string, unknown>) ?? {},
    })),
  };
}
