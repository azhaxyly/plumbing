import { prisma } from "@timsan/db";
import { searchProducts } from "@timsan/search";
import type { SearchResult } from "@timsan/search";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { FacetPanel } from "@/components/catalog/facet-panel";
import { ProductCard } from "@/components/catalog/product-card";
import type { ProductCardData } from "@/components/catalog/product-card";
import { parseFacetFilters } from "@/lib/facet-utils";

// Force dynamic rendering — search results must never be cached/ISR
export const dynamic = "force-dynamic";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  return {
    title: query ? `Поиск: ${query}` : "Поиск",
    description: query
      ? `Результаты поиска по запросу «${query}»`
      : "Поиск товаров в каталоге",
    robots: { index: false, follow: true },
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const rawParams = await searchParams;

  const q = typeof rawParams["q"] === "string" ? rawParams["q"].trim() : "";

  // Parse facet filters from URL
  const urlSearchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    if (Array.isArray(value)) {
      for (const v of value) urlSearchParams.append(key, v);
    } else if (value !== undefined) {
      urlSearchParams.set(key, value);
    }
  }
  const currentFilters = parseFacetFilters(urlSearchParams);

  // Build Meilisearch filter string from facet filters
  const filterParts: string[] = [];

  if (currentFilters.brands && currentFilters.brands.length > 0) {
    const brandFilter = currentFilters.brands
      .map((slug) => `brandSlug = "${slug}"`)
      .join(" OR ");
    filterParts.push(`(${brandFilter})`);
  }

  if (currentFilters.price) {
    if (currentFilters.price.min > 0) {
      filterParts.push(`priceCents >= ${currentFilters.price.min}`);
    }
    if (currentFilters.price.max < Number.MAX_SAFE_INTEGER) {
      filterParts.push(`priceCents <= ${currentFilters.price.max}`);
    }
  }

  // Always filter for active products
  filterParts.push(`status = "active"`);

  const filterString = filterParts.join(" AND ");

  // Perform search (empty query returns empty results)
  let searchResult: SearchResult = { hits: [], totalHits: 0, query: q, processingTimeMs: 0 };

  if (q) {
    searchResult = await searchProducts(q, {
      limit: 48,
      offset: 0,
      filter: filterString,
    }, prisma);
  }

  // Map search hits to ProductCardData
  const products: ProductCardData[] = searchResult.hits.map((hit) => ({
    id: hit.id,
    slug: hit.slug,
    name: hit.name,
    priceCents: hit.priceCents,
    compareAtPriceCents: hit.compareAtPriceCents,
    primaryImageUrl: hit.primaryImageUrl,
    primaryImageAlt: hit.name,
    brandName: hit.brandName,
    inStock: hit.inStock,
  }));

  // Build facet data from search results for the FacetPanel
  // Derive unique brands from hits
  const brandMap = new Map<string, { id: string; slug: string; name: string }>();
  for (const hit of searchResult.hits) {
    if (hit.brandSlug && hit.brandName && !brandMap.has(hit.brandSlug)) {
      brandMap.set(hit.brandSlug, {
        id: hit.brandSlug,
        slug: hit.brandSlug,
        name: hit.brandName,
      });
    }
  }
  const facetBrands = Array.from(brandMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ru"),
  );

  // Derive price range from hits
  let priceMin = 0;
  let priceMax = 0;
  if (searchResult.hits.length > 0) {
    const firstHit = searchResult.hits[0];
    priceMin = firstHit?.priceCents ?? 0;
    priceMax = firstHit?.priceCents ?? 0;
    for (const hit of searchResult.hits) {
      if (hit.priceCents < priceMin) priceMin = hit.priceCents;
      if (hit.priceCents > priceMax) priceMax = hit.priceCents;
    }
  }

  const basePath = "/search";
  const hasFacets = facetBrands.length > 0;

  return (
    <>
      {/* Breadcrumbs */}
      <nav aria-label="Хлебные крошки" className="border-b bg-gray-50">
        <div className="container mx-auto px-4 py-3 md:px-6">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
            <li>
              <Link href={"/" as Route} className="transition-colors hover:text-amber-600">
                Главная
              </Link>
            </li>
            <li className="flex items-center gap-1">
              <span aria-hidden="true" className="text-gray-300">
                /
              </span>
              <span className="font-medium text-gray-800" aria-current="page">
                Поиск
              </span>
            </li>
          </ol>
        </div>
      </nav>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8 md:px-6">
        {/* Search heading */}
        <div className="mb-6">
          {q ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900">
                Поиск:{" "}
                <span className="text-amber-600">&laquo;{q}&raquo;</span>
              </h1>
              {searchResult.totalHits > 0 ? (
                <p className="mt-1 text-sm text-gray-500">
                  Найдено{" "}
                  <span className="font-medium text-gray-700">
                    {searchResult.totalHits}
                  </span>{" "}
                  {pluralizeProducts(searchResult.totalHits)} по запросу{" "}
                  &laquo;{q}&raquo;
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  По запросу &laquo;{q}&raquo; ничего не найдено
                </p>
              )}
            </>
          ) : (
            <h1 className="text-2xl font-bold text-gray-900">Поиск</h1>
          )}
        </div>

        {/* Empty query state */}
        {!q && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg text-gray-500">
              Введите поисковый запрос
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Используйте строку поиска в шапке сайта
            </p>
          </div>
        )}

        {/* No results state */}
        {q && searchResult.totalHits === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg font-medium text-gray-700">
              Ничего не найдено
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Попробуйте изменить запрос или воспользуйтесь каталогом
            </p>
            <Link
              href={"/category" as Route}
              className="mt-4 inline-flex items-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
            >
              Перейти в каталог
            </Link>
          </div>
        )}

        {/* Results with optional facet sidebar */}
        {q && products.length > 0 && (
          <>
            {hasFacets ? (
              <div className="flex gap-8">
                {/* Facet sidebar */}
                <div className="hidden w-64 shrink-0 lg:block">
                  <Suspense fallback={null}>
                    <FacetPanel
                      brands={facetBrands}
                      attributes={[]}
                      priceRange={{ min: priceMin, max: priceMax }}
                      currentFilters={currentFilters}
                      basePath={basePath}
                    />
                  </Suspense>
                </div>

                {/* Product grid */}
                <div className="min-w-0 flex-1">
                  <SearchResultGrid products={products} />
                </div>
              </div>
            ) : (
              <SearchResultGrid products={products} />
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SearchResultGrid({ products }: { products: ProductCardData[] }) {
  return (
    <ul
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      aria-label="Результаты поиска"
    >
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pluralizeProducts(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod100 >= 11 && mod100 <= 19) return "товаров";
  if (mod10 === 1) return "товар";
  if (mod10 >= 2 && mod10 <= 4) return "товара";
  return "товаров";
}
