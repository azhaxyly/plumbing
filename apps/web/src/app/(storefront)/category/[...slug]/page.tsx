import { getCategoryBySlugPath , prisma } from "@timsan/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CategoryListing } from "@/components/catalog/category-listing";
import { FacetPanel } from "@/components/catalog/facet-panel";
import type { ProductCardData } from "@/components/catalog/product-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getFacetData } from "@/lib/facet-data";
import { parseFacetFilters } from "@/lib/facet-utils";

export const revalidate = 300; // ISR: revalidate every 5 minutes

interface CategoryPageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// ─── Product query with facet filters ────────────────────────────────────────

interface ProductQueryOptions {
  categoryId: string;
  brandSlugs?: string[];
  priceMin?: number;
  priceMax?: number;
  attributeFilters?: Record<string, string[]>; // attributeSlug → valueSlugs[]
}

async function getCategoryProducts(
  opts: ProductQueryOptions,
): Promise<ProductCardData[]> {
  const { categoryId, brandSlugs, priceMin, priceMax, attributeFilters } = opts;

  // Build brand filter
  const brandFilter =
    brandSlugs && brandSlugs.length > 0
      ? { brand: { slug: { in: brandSlugs } } }
      : {};

  // Build price filter
  const priceFilter: Record<string, number> = {};
  if (priceMin !== undefined) priceFilter["gte"] = priceMin;
  if (priceMax !== undefined) priceFilter["lte"] = priceMax;

  // Build attribute filters — each attribute must match at least one of its selected values
  const attrEntries = Object.entries(attributeFilters ?? {}).filter(
    ([, vals]) => vals.length > 0,
  );
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

  const products = await prisma.product.findMany({
    where: {
      status: "active",
      categories: { some: { categoryId } },
      ...(Object.keys(priceFilter).length > 0
        ? { priceCents: priceFilter }
        : {}),
      ...brandFilter,
      ...attributeWhere,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      priceCents: true,
      compareAtPriceCents: true,
      brand: { select: { name: true } },
      images: {
        where: { isPrimary: true },
        select: { url: true, alt: true },
        take: 1,
      },
      variants: { select: { quantity: true, reserved: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 48,
  });

  return products.map((p) => {
    const primaryImage = p.images[0] ?? null;
    const totalAvailable = p.variants.reduce(
      (sum, v) => sum + (v.quantity - v.reserved),
      0,
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
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCategoryBySlugPath(slug);

  if (!result) {
    return { title: "Категория не найдена" };
  }

  const { category } = result;

  return {
    title: category.seoTitle ?? category.name,
    description: category.seoDescription ?? category.description ?? undefined,
    keywords: category.seoKeywords ?? undefined,
    alternates: { canonical: `/category/${slug.join("/")}` },
    openGraph: {
      title: category.seoTitle ?? category.name,
      description: category.seoDescription ?? category.description ?? undefined,
      url: `/category/${slug.join("/")}`,
      type: "website",
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const rawSearchParams = await searchParams;

  const result = await getCategoryBySlugPath(slug);
  if (!result) notFound();

  const { category, ancestors, children } = result;

  // Parse facet filters from URL search params
  const urlSearchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(rawSearchParams)) {
    if (Array.isArray(value)) {
      for (const v of value) urlSearchParams.append(key, v);
    } else if (value !== undefined) {
      urlSearchParams.set(key, value);
    }
  }
  const currentFilters = parseFacetFilters(urlSearchParams);

  // Extract attribute filters (everything that's not brands/price)
  const attributeFilters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(currentFilters)) {
    if (key !== "brands" && key !== "price" && Array.isArray(value)) {
      attributeFilters[key] = value as string[];
    }
  }

  // Fetch products with applied filters
  const queryOpts: ProductQueryOptions = { categoryId: category.id };
  if (currentFilters.brands && currentFilters.brands.length > 0) {
    queryOpts.brandSlugs = currentFilters.brands;
  }
  if (currentFilters.price) {
    queryOpts.priceMin = currentFilters.price.min;
    queryOpts.priceMax = currentFilters.price.max;
  }
  if (Object.keys(attributeFilters).length > 0) {
    queryOpts.attributeFilters = attributeFilters;
  }
  const products = await getCategoryProducts(queryOpts);

  // Fetch facet data (cached in Redis)
  const facetData = await getFacetData(category.id);

  // Build breadcrumbs
  const breadcrumbItems = [
    { name: "Главная", href: "/" },
    ...ancestors.map((ancestor, index) => ({
      name: ancestor.name,
      href: `/category/${ancestors.slice(0, index + 1).map((a) => a.slug).join("/")}`,
    })),
    { name: category.name, href: `/category/${slug.join("/")}` },
  ];

  const basePath = `/category/${slug.join("/")}`;
  const hasFacets =
    facetData.brands.length > 0 || facetData.attributes.length > 0;

  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />

      {/* Main content: sidebar + listing */}
      {hasFacets ? (
        <div className="container mx-auto flex gap-8 px-4 py-8 md:px-6">
          {/* Facet sidebar */}
          <div className="hidden w-64 shrink-0 lg:block">
            <Suspense fallback={null}>
              <FacetPanel
                brands={facetData.brands}
                attributes={facetData.attributes}
                priceRange={facetData.priceRange}
                currentFilters={currentFilters}
                basePath={basePath}
              />
            </Suspense>
          </div>

          {/* Product listing */}
          <div className="min-w-0 flex-1">
            <CategoryListing
              categoryName={category.name}
              categoryDescription={category.description}
              subCategories={children.map((child) => ({
                id: child.id,
                slug: child.slug,
                name: child.name,
                productsCount: child.productsCount,
              }))}
              products={products}
              slugPath={slug}
            />
          </div>
        </div>
      ) : (
        <CategoryListing
          categoryName={category.name}
          categoryDescription={category.description}
          subCategories={children.map((child) => ({
            id: child.id,
            slug: child.slug,
            name: child.name,
            productsCount: child.productsCount,
          }))}
          products={products}
          slugPath={slug}
        />
      )}
    </>
  );
}
