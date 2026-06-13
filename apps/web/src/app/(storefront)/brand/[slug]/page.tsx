import { getAllCategoryPaths, getBrandBySlug, getBrandCategories, getBrandProductsPage } from "@timsan/db";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CategoryListing } from "@/components/catalog/category-listing";
import { FacetPanel } from "@/components/catalog/facet-panel";
import { CategoryGrid } from "@/components/home/category-grid";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { FilterTransitionProvider, ProductsTransitionArea } from "@/contexts/filter-transition-context";
import { getFacetDataForBrand } from "@/lib/facet-data";
import { parseFacetFilters } from "@/lib/facet-utils";
import type { CategoryItem } from "@/lib/homepage-data";

export const revalidate = 300;

const PAGE_SIZE = 48;

interface BrandPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params, searchParams }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);

  if (!brand) return { title: "Бренд не найден" };

  const title = brand.name;
  const description = brand.description ?? `Товары бренда ${brand.name}`;

  // Self-canonical pagination (page param only; facets/sort excluded).
  const page = Math.max(1, parseInt((await searchParams).page as string) || 1);
  const canonical = `/brand/${slug}` + (page > 1 ? `?page=${page}` : "");

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      ...(brand.logoUrl ? { images: [{ url: brand.logoUrl }] } : {}),
    },
  };
}

type SortValue = "newest" | "price_asc" | "price_desc" | "name_asc";
const VALID_SORTS: SortValue[] = ["newest", "price_asc", "price_desc", "name_asc"];

function buildPaginationUrl(basePath: string, params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  if (page <= 1) next.delete("page");
  else next.set("page", page.toString());
  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const { slug } = await params;
  const rawSearchParams = await searchParams;

  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  const basePath = `/brand/${slug}`;

  // Parse URL params
  const page = Math.max(1, parseInt((rawSearchParams.page as string) ?? "1") || 1);
  const rawSort = rawSearchParams.sort as string | undefined;
  const currentSort: SortValue =
    rawSort && VALID_SORTS.includes(rawSort as SortValue) ? (rawSort as SortValue) : "newest";

  const urlSearchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(rawSearchParams)) {
    if (Array.isArray(value)) {
      for (const v of value) urlSearchParams.append(key, v);
    } else if (value !== undefined) {
      urlSearchParams.set(key, value);
    }
  }
  const currentFilters = parseFacetFilters(urlSearchParams);

  const attributeFilters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(currentFilters)) {
    if (key !== "brands" && key !== "price" && Array.isArray(value)) {
      attributeFilters[key] = value as string[];
    }
  }

  // Fetch in parallel: categories, products, facets, canonical category paths
  const [brandCategories, { products, totalCount }, facetData, categoryPaths] = await Promise.all([
    getBrandCategories(brand.id),
    getBrandProductsPage({
      brandId: brand.id,
      sort: currentSort,
      page,
      pageSize: PAGE_SIZE,
      ...(currentFilters.price
        ? { priceMin: currentFilters.price.min, priceMax: currentFilters.price.max }
        : {}),
      attributeFilters,
    }),
    getFacetDataForBrand(brand.id),
    getAllCategoryPaths(),
  ]);

  // slug → canonical full path (slugs are globally unique), so brand→category
  // links point straight at the canonical URL instead of bouncing through a 308.
  const slugToPath = new Map(
    categoryPaths.map((c) => [c.path.split("/").pop() as string, c.path]),
  );

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const paginationUrls = {
    prevPageUrl: page > 1 ? buildPaginationUrl(basePath, urlSearchParams, page - 1) : null,
    nextPageUrl: page < totalPages ? buildPaginationUrl(basePath, urlSearchParams, page + 1) : null,
  };

  const hasFacets =
    facetData.attributes.length > 0 ||
    facetData.priceRange.min !== facetData.priceRange.max;

  // Cast to CategoryItem for CategoryGrid (shapes are compatible)
  const categoryItems: CategoryItem[] = brandCategories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    imageUrl: c.imageUrl,
    children: c.children,
  }));

  const breadcrumbItems = [
    { name: "Главная", href: "/" },
    { name: "Бренды", href: "/brand" },
    { name: brand.name, href: `/brand/${brand.slug}` },
  ];

  const listingPropsBase = {
    categoryName: brand.name,
    categoryDescription: null,
    subCategories: [],
    products,
    slugPath: [],
    basePath,
    pagination: { page, totalPages, totalCount, ...paginationUrls },
    currentSort,
  };

  const showHero = !!(brand.logoUrl || brand.description || brand.coverImageUrl);

  return (
    <FilterTransitionProvider>
      <>
        <Breadcrumbs items={breadcrumbItems} />

        {/* Brand hero banner */}
        {showHero && (
          <div className="relative w-full">
            {/* Banner — clips the background image */}
            <div className="relative h-[420px] overflow-hidden">
              {brand.coverImageUrl ? (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${brand.coverImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center center",
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
              )}

              {/* Gradient overlay — darkens top for title readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-transparent" />

              {/* Brand name — top left */}
              <div className="absolute left-0 top-0 z-10 px-4 pt-8 md:px-6">
                <h1 className="text-3xl font-bold text-white drop-shadow-md md:text-4xl">{brand.name}</h1>
              </div>
            </div>

            {/* Logo — overflows half outside the banner bottom edge */}
            {brand.logoUrl && (
              <div className="absolute bottom-0 left-4 z-20 translate-y-1/2 md:left-6">
                <div className="relative h-28 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    fill
                    sizes="176px"
                    className="object-contain p-2"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Below-banner section: spacer for logo + description */}
        {showHero && (brand.logoUrl || brand.description) && (
          <div className="border-b bg-white">
            <div className="container mx-auto flex items-start gap-8 px-4 pb-10 pt-16 md:px-6">
              {brand.logoUrl && <div className="w-44 shrink-0" />}
              {brand.description && (
                <div className="min-w-0 flex-1">
                  <h2 className="mb-3 text-lg font-semibold text-gray-900">О бренде</h2>
                  <p className="whitespace-pre-line text-sm leading-7 text-gray-600 md:text-base md:leading-8">
                    {brand.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Category tiles */}
        {categoryItems.length > 0 && (
          <div className="container mx-auto px-4 pt-8 md:px-6">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Категории</h2>
            <CategoryGrid
              categories={categoryItems}
              getHref={(categorySlug) =>
                `/category/${slugToPath.get(categorySlug) ?? categorySlug}?brand=${brand.slug}`
              }
            />
          </div>
        )}

        {/* Products with facets */}
        {hasFacets ? (
          <div className="container mx-auto flex gap-8 px-4 py-8 md:px-6">
            <div className="hidden w-64 shrink-0 lg:block">
              <Suspense fallback={null}>
                <FacetPanel
                  brands={[]}
                  attributes={facetData.attributes}
                  priceRange={facetData.priceRange}
                  currentFilters={currentFilters}
                  basePath={basePath}
                />
              </Suspense>
            </div>
            <ProductsTransitionArea className="min-w-0 flex-1">
              {!showHero && <h1 className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl">{brand.name}</h1>}
              <CategoryListing {...listingPropsBase} showHeader={false} />
            </ProductsTransitionArea>
          </div>
        ) : (
          <ProductsTransitionArea>
            <CategoryListing {...listingPropsBase} showHeader={!showHero} />
          </ProductsTransitionArea>
        )}
      </>
    </FilterTransitionProvider>
  );
}
