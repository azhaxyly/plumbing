import { getCategoryTree } from "@timsan/db";
import type { Metadata , Route } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Каталог товаров",
  description:
    "Весь ассортимент сантехники: ванны, смесители, душевые системы, раковины, унитазы и аксессуары для ванной комнаты.",
  alternates: { canonical: "/category" },
  openGraph: {
    title: "Каталог товаров",
    description:
      "Весь ассортимент сантехники: ванны, смесители, душевые системы, раковины, унитазы и аксессуары для ванной комнаты.",
    url: "/category",
    type: "website",
  },
};

const breadcrumbItems = [
  { name: "Главная", href: "/" },
  { name: "Каталог", href: "/category" },
];

export default async function CatalogPage() {
  const categories = await getCategoryTree().catch(() => []);

  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />

      <div className="container mx-auto px-4 py-8 md:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Каталог товаров
          </h1>
          <p className="mt-2 text-gray-500">
            Выберите категорию, чтобы найти нужный товар
          </p>
        </div>

        {categories.length === 0 ? (
          <p className="py-16 text-center text-gray-400">
            Категории не найдены
          </p>
        ) : (
          <div className="space-y-10">
            {categories.map((cat) => (
              <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
                <div className="mb-4 flex items-baseline gap-3 border-b border-stone-100 pb-3">
                  <h2
                    id={`cat-${cat.id}`}
                    className="text-lg font-bold text-stone-800"
                  >
                    {cat.name}
                  </h2>
                  <Link
                    href={`/category/${cat.slug}` as Route}
                    className="text-xs text-emerald-600 hover:underline"
                  >
                    Все товары →
                  </Link>
                </div>

                {cat.children.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {cat.children.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/category/${cat.slug}/${sub.slug}` as Route}
                        className="group flex flex-col items-center justify-center rounded-xl border bg-gray-50 p-4 text-center transition-all hover:border-emerald-300 hover:bg-emerald-50"
                      >
                        <span className="text-sm font-medium text-gray-700 group-hover:text-emerald-800">
                          {sub.name}
                        </span>
                        {sub.productsCount > 0 && (
                          <span className="mt-1 text-xs text-gray-400">
                            {sub.productsCount} {pluralize(sub.productsCount)}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    href={`/category/${cat.slug}` as Route}
                    className="inline-flex items-center gap-2 rounded-xl border bg-gray-50 px-5 py-3 text-sm font-medium text-gray-700 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    {cat.name}
                    {cat.productsCount > 0 && (
                      <span className="text-xs text-gray-400">
                        {cat.productsCount} {pluralize(cat.productsCount)}
                      </span>
                    )}
                  </Link>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function pluralize(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return "товаров";
  if (mod10 === 1) return "товар";
  if (mod10 >= 2 && mod10 <= 4) return "товара";
  return "товаров";
}
