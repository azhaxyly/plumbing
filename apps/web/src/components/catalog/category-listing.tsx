import type { Route } from "next";
import Link from "next/link";

import { ProductCard, type ProductCardData } from "./product-card";

interface SubCategory {
  id: string;
  slug: string;
  name: string;
  productsCount: number;
}

interface CategoryListingProps {
  categoryName: string;
  categoryDescription: string | null;
  subCategories: SubCategory[];
  products: ProductCardData[];
  /** Full slug path for building sub-category links, e.g. ["bathtubs"] */
  slugPath: string[];
}

export function CategoryListing({
  categoryName,
  categoryDescription,
  subCategories,
  products,
  slugPath,
}: CategoryListingProps) {
  const basePath = `/category/${slugPath.join("/")}`;

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      {/* Category header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          {categoryName}
        </h1>
        {categoryDescription && (
          <p className="mt-2 text-gray-500">{categoryDescription}</p>
        )}
      </div>

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
        <section aria-label={`Товары в категории ${categoryName}`}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
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
