import { getCategoryBySlugPath , prisma } from "@timsan/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CategoryListing } from "@/components/catalog/category-listing";
import { FacetPanel } from "@/components/catalog/facet-panel";
import type { ProductCardData } from "@/components/catalog/product-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { FilterTransitionProvider, ProductsTransitionArea } from "@/contexts/filter-transition-context";
import { filterFacetData } from "@/lib/facet-config";
import { getFacetData } from "@/lib/facet-data";
import { parseFacetFilters } from "@/lib/facet-utils";

export const revalidate = 300;

const PAGE_SIZE = 48;

interface CategoryPageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// ─── Product query helpers ────────────────────────────────────────────────────

type SortValue = "newest" | "price_asc" | "price_desc" | "name_asc";

function getSortOrderBy(sort: SortValue) {
  switch (sort) {
    case "price_asc": return { priceCents: "asc" as const };
    case "price_desc": return { priceCents: "desc" as const };
    case "name_asc": return { name: "asc" as const };
    default: return { createdAt: "desc" as const };
  }
}

interface ProductQueryOptions {
  categoryId: string;
  brandSlugs?: string[];
  priceMin?: number;
  priceMax?: number;
  attributeFilters?: Record<string, string[]>;
  sort?: SortValue;
}

function buildProductWhere(opts: ProductQueryOptions) {
  const { categoryId, brandSlugs, priceMin, priceMax, attributeFilters } = opts;

  const brandFilter =
    brandSlugs && brandSlugs.length > 0
      ? { brand: { slug: { in: brandSlugs } } }
      : {};

  const priceFilter: Record<string, number> = {};
  if (priceMin !== undefined) priceFilter["gte"] = priceMin;
  if (priceMax !== undefined) priceFilter["lte"] = priceMax;

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

  return {
    status: "active",
    categories: { some: { categoryId } },
    ...(Object.keys(priceFilter).length > 0 ? { priceCents: priceFilter } : {}),
    ...brandFilter,
    ...attributeWhere,
  } as const;
}

async function getCategoryProducts(
  opts: ProductQueryOptions,
  page: number,
): Promise<ProductCardData[]> {
  const where = buildProductWhere(opts);

  const products = await prisma.product.findMany({
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
    orderBy: getSortOrderBy(opts.sort ?? "newest"),
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
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
      brandSlug: p.brand?.slug ?? null,
      inStock: totalAvailable > 0,
    };
  });
}

async function getCategoryProductsCount(opts: ProductQueryOptions): Promise<number> {
  return prisma.product.count({ where: buildProductWhere(opts) });
}

// ─── Pagination URL builder ───────────────────────────────────────────────────

function buildPaginationUrl(
  basePath: string,
  params: URLSearchParams,
  page: number,
): string {
  const next = new URLSearchParams(params);
  if (page <= 1) {
    next.delete("page");
  } else {
    next.set("page", page.toString());
  }
  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
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

  // Parse current page
  const page = Math.max(1, parseInt((rawSearchParams.page as string) ?? "1") || 1);

  // Parse sort
  const VALID_SORTS: SortValue[] = ["newest", "price_asc", "price_desc", "name_asc"];
  const rawSort = rawSearchParams.sort as string | undefined;
  const currentSort: SortValue =
    rawSort && VALID_SORTS.includes(rawSort as SortValue)
      ? (rawSort as SortValue)
      : "newest";

  // Build URLSearchParams from rawSearchParams (used for facet parsing + pagination URL building)
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

  // Build query options
  const queryOpts: ProductQueryOptions = { categoryId: category.id, sort: currentSort };
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

  // Fetch products + total count in parallel
  const [products, totalCount] = await Promise.all([
    getCategoryProducts(queryOpts, page),
    getCategoryProductsCount(queryOpts),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const basePath = `/category/${slug.join("/")}`;

  const paginationUrls = {
    prevPageUrl: page > 1 ? buildPaginationUrl(basePath, urlSearchParams, page - 1) : null,
    nextPageUrl: page < totalPages ? buildPaginationUrl(basePath, urlSearchParams, page + 1) : null,
  };

  // Fetch facet data (cached in Redis) and apply category-specific filters
  const facetData = filterFacetData(await getFacetData(category.id), category.slug);

  // Build breadcrumbs
  const breadcrumbItems = [
    { name: "Главная", href: "/" },
    ...ancestors.map((ancestor, index) => ({
      name: ancestor.name,
      href: `/category/${ancestors.slice(0, index + 1).map((a) => a.slug).join("/")}`,
    })),
    { name: category.name, href: `/category/${slug.join("/")}` },
  ];

  const hasFacets =
    facetData.brands.length > 0 || facetData.attributes.length > 0;

  const listingProps = {
    categoryName: category.name,
    categoryDescription: category.description,
    subCategories: children.map((child) => ({
      id: child.id,
      slug: child.slug,
      name: child.name,
      productsCount: child.productsCount,
    })),
    products,
    slugPath: slug,
    pagination: {
      page,
      totalPages,
      totalCount,
      ...paginationUrls,
    },
    currentSort,
  };

  return (
    <FilterTransitionProvider>
      <>
        <Breadcrumbs items={breadcrumbItems} />

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
            <ProductsTransitionArea className="min-w-0 flex-1">
              <CategoryListing {...listingProps} />
            </ProductsTransitionArea>
          </div>
        ) : (
          <ProductsTransitionArea>
            <CategoryListing {...listingProps} />
          </ProductsTransitionArea>
        )}
      </>
    </FilterTransitionProvider>
  );
}
