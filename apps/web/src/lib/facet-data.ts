/**
 * Facet data fetcher — tries Redis cache first, falls back to DB.
 */

import { prisma } from "@timsan/db";


import {
  getCachedFacets,
  setCachedFacets,
  type FacetData,
} from "./facet-cache";

export type { FacetData } from "./facet-cache";

/**
 * Returns facet data for a category:
 *  - brands present in the category's products
 *  - attributes (with values) present in the category's products
 *  - min/max price range (in tiyins)
 *
 * Results are cached in Redis for 60 seconds.
 */
export async function getFacetData(categoryId: string): Promise<FacetData> {
  // 1. Try cache
  const cached = await getCachedFacets(categoryId);
  if (cached) return cached;

  // 2. Query DB
  const data = await fetchFacetDataFromDb(categoryId);

  // 3. Populate cache (fire-and-forget)
  void setCachedFacets(categoryId, data);

  return data;
}

/**
 * Returns facet data (attributes + price range, no brands) for a brand.
 * Not cached — brand pages are typically less frequent than category pages.
 */
export async function getFacetDataForBrand(brandId: string): Promise<FacetData> {
  const products = await prisma.product.findMany({
    where: { status: "active", brandId },
    select: {
      priceCents: true,
      productAttributes: {
        select: {
          attribute: { select: { id: true, name: true, slug: true } },
          attributeValue: { select: { id: true, value: true, slug: true } },
        },
      },
    },
  });

  if (products.length === 0) {
    return { brands: [], attributes: [], priceRange: { min: 0, max: 0 } };
  }

  const attrMap = new Map<
    string,
    { id: string; name: string; slug: string; values: Map<string, { id: string; value: string; slug: string }> }
  >();
  for (const p of products) {
    for (const pa of p.productAttributes) {
      const { attribute, attributeValue } = pa;
      if (!attrMap.has(attribute.id)) {
        attrMap.set(attribute.id, { ...attribute, values: new Map() });
      }
      const entry = attrMap.get(attribute.id);
      if (entry && !entry.values.has(attributeValue.id)) {
        entry.values.set(attributeValue.id, attributeValue);
      }
    }
  }

  const attributes = Array.from(attrMap.values())
    .map((attr) => ({
      id: attr.id,
      name: attr.name,
      slug: attr.slug,
      values: Array.from(attr.values.values()).sort((a, b) => a.value.localeCompare(b.value, "ru")),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  let minPrice = Infinity;
  let maxPrice = 0;
  for (const p of products) {
    if (p.priceCents < minPrice) minPrice = p.priceCents;
    if (p.priceCents > maxPrice) maxPrice = p.priceCents;
  }

  return { brands: [], attributes, priceRange: { min: minPrice, max: maxPrice } };
}

async function fetchFacetDataFromDb(categoryId: string): Promise<FacetData> {
  // Get all active products in this category
  const products = await prisma.product.findMany({
    where: {
      status: "active",
      categories: { some: { categoryId } },
    },
    select: {
      priceCents: true,
      brand: {
        select: { id: true, slug: true, name: true },
      },
      productAttributes: {
        select: {
          attribute: {
            select: { id: true, name: true, slug: true },
          },
          attributeValue: {
            select: { id: true, value: true, slug: true },
          },
        },
      },
    },
  });

  if (products.length === 0) {
    return {
      brands: [],
      attributes: [],
      priceRange: { min: 0, max: 0 },
    };
  }

  // ── Brands ──────────────────────────────────────────────────────────────────
  const brandMap = new Map<string, { id: string; slug: string; name: string }>();
  for (const p of products) {
    if (p.brand && !brandMap.has(p.brand.id)) {
      brandMap.set(p.brand.id, p.brand);
    }
  }
  const brands = Array.from(brandMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ru"),
  );

  // ── Attributes ──────────────────────────────────────────────────────────────
  // Map: attributeId → { meta, values: Map<valueId, value> }
  const attrMap = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
      values: Map<string, { id: string; value: string; slug: string }>;
    }
  >();

  for (const p of products) {
    for (const pa of p.productAttributes) {
      const { attribute, attributeValue } = pa;
      if (!attrMap.has(attribute.id)) {
        attrMap.set(attribute.id, {
          ...attribute,
          values: new Map(),
        });
      }
      const entry = attrMap.get(attribute.id);
      if (entry && !entry.values.has(attributeValue.id)) {
        entry.values.set(attributeValue.id, attributeValue);
      }
    }
  }

  const attributes = Array.from(attrMap.values())
    .map((attr) => ({
      id: attr.id,
      name: attr.name,
      slug: attr.slug,
      values: Array.from(attr.values.values()).sort((a, b) =>
        a.value.localeCompare(b.value, "ru"),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  // ── Price range ──────────────────────────────────────────────────────────────
  const firstProduct = products[0];
  let minPrice = firstProduct?.priceCents ?? 0;
  let maxPrice = firstProduct?.priceCents ?? 0;
  for (const p of products) {
    if (p.priceCents < minPrice) minPrice = p.priceCents;
    if (p.priceCents > maxPrice) maxPrice = p.priceCents;
  }

  return {
    brands,
    attributes,
    priceRange: { min: minPrice, max: maxPrice },
  };
}
