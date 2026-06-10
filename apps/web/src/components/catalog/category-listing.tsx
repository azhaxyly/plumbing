import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SortSelector } from "./sort-selector";
import { ProductCard, type ProductCardData } from "./product-card";

interface SubCategory {
  id: string;
  slug: string;
  name: string;
  productsCount: number;
}

interface PaginationInfo {
  page: number;
  totalPages: number;
  totalCount: number;
  prevPageUrl: string | null;
  nextPageUrl: string | null;
}

interface CategoryListingProps {
  categoryName: string;
  categoryDescription: string | null;
  subCategories: SubCategory[];
  products: ProductCardData[];
  slugPath: string[];
  pagination: PaginationInfo;
  currentSort: string;
  /** Override the computed /category/{slugPath} base path */
  basePath?: string;
  /** Hide the h1 heading (useful when the page already has a header) */
  showHeader?: boolean;
}

export function CategoryListing({
  categoryName,
  categoryDescription,
  subCategories,
  products,
  slugPath,
  pagination,
  currentSort,
  basePath: basePathProp,
  showHeader = true,
}: CategoryListingProps) {
  const basePath = basePathProp ?? `/category/${slugPath.join("/")}`;

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      {/* Category header */}
      {showHeader && (
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            {categoryName}
          </h1>
          {categoryDescription && (
            <p className="mt-2 text-gray-500">{categoryDescription}</p>
          )}
        </div>
      )}

      {/* Sub-categories */}
      {subCategories.length > 0 && (
        <section className="mb-8" aria-label="Подкатегории">
          <h2 className="mb-4 text-lg font-semibold text-gray-700">
            Подкатегории
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {subCategories.map((sub) => (
              <Link
                key={sub.id}
                href={`${basePath}/${sub.slug}` as Route}
                className="group flex flex-col items-center justify-center rounded-xl border bg-gray-50 p-4 text-center transition-all hover:border-amber-400 hover:bg-amber-50"
              >
                <span className="text-sm font-medium text-gray-700 group-hover:text-amber-700">
                  {sub.name}
                </span>
                {sub.productsCount > 0 && (
                  <span className="mt-1 text-xs text-gray-400">
                    {sub.productsCount}{" "}
                    {pluralizeProducts(sub.productsCount)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Products grid */}
      {products.length > 0 ? (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {pagination.totalCount} {pluralizeProducts(pagination.totalCount)}
            </p>
            <Suspense fallback={null}>
              <SortSelector currentSort={currentSort} basePath={basePath} />
            </Suspense>
          </div>

          <section aria-label={`Товары в категории ${categoryName}`}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <nav
              aria-label="Пагинация"
              className="mt-10 flex items-center justify-center gap-3"
            >
              {pagination.prevPageUrl ? (
                <Link
                  href={pagination.prevPageUrl as Route}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
                >
                  ← Назад
                </Link>
              ) : (
                <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed">
                  ← Назад
                </span>
              )}

              <span className="text-sm text-gray-500">
                Страница {pagination.page} из {pagination.totalPages}
              </span>

              {pagination.nextPageUrl ? (
                <Link
                  href={pagination.nextPageUrl as Route}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
                >
                  Вперёд →
                </Link>
              ) : (
                <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed">
                  Вперёд →
                </span>
              )}
            </nav>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-medium text-gray-500">
            Товары не найдены
          </p>
          <p className="mt-1 text-sm text-gray-400">
            В этой категории пока нет товаров
          </p>
        </div>
      )}
    </div>
  );
}

function pluralizeProducts(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod100 >= 11 && mod100 <= 19) return "товаров";
  if (mod10 === 1) return "товар";
  if (mod10 >= 2 && mod10 <= 4) return "товара";
  return "товаров";
}
