import { getAllBrands } from "@whitehouse/db";
import type { Metadata , Route } from "next";
import Image from "next/image";
import Link from "next/link";


export const revalidate = 300; // ISR: revalidate every 5 minutes

export const metadata: Metadata = {
  title: "Бренды",
  description: "Все бренды сантехники и мебели для ванной комнаты",
  alternates: {
    canonical: "/brand",
  },
  openGraph: {
    title: "Бренды",
    description: "Все бренды сантехники и мебели для ванной комнаты",
    url: "/brand",
    type: "website",
  },
};

export default async function BrandsPage() {
  const brands = await getAllBrands();

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          Бренды
        </h1>
        <p className="mt-2 text-gray-500">
          Выберите бренд, чтобы посмотреть товары
        </p>
      </div>

      {brands.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brand/${brand.slug}` as Route}
              className="group flex flex-col items-center justify-center gap-3 rounded-xl border bg-white p-6 text-center shadow-sm transition-all hover:border-amber-400 hover:shadow-md"
            >
              {/* Brand logo */}
              {brand.logoUrl ? (
                <div className="relative h-16 w-full">
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    fill
                    sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-full items-center justify-center rounded-lg bg-gray-100 text-lg font-bold text-gray-400">
                  {brand.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Brand name */}
              <span className="text-sm font-medium text-gray-800 group-hover:text-amber-700">
                {brand.name}
              </span>

              {/* Products count */}
              {brand.productsCount > 0 && (
                <span className="text-xs text-gray-400">
                  {brand.productsCount}{" "}
                  {pluralizeProducts(brand.productsCount)}
                </span>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-medium text-gray-500">
            Бренды не найдены
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Бренды появятся здесь после добавления товаров
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
