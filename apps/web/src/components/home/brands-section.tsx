import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import type { BrandItem } from "@/lib/homepage-data";

interface BrandsSectionProps {
  brands: BrandItem[];
}

export function BrandsSection({ brands }: BrandsSectionProps) {
  if (!brands || brands.length === 0) {
    return null;
  }

  const visibleBrands = brands.slice(0, 10);

  return (
    <section className="bg-white py-6 md:py-12">
      <div className="container mx-auto px-4">
        <div className="mb-4 flex items-center justify-between gap-3 md:mb-6">
          <h2 className="text-xl font-bold text-stone-900 md:text-3xl">Популярные бренды</h2>
          <Link
            href={"/brand" as Route}
            className="flex items-center rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition-colors hover:text-stone-900"
          >
            Смотреть все бренды
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-hidden border border-stone-200">
          <div className="grid grid-cols-3 md:grid-cols-5">
            {visibleBrands.map((brand, index) => (
              <Link
                key={brand.id}
                href={`/brand/${brand.slug}` as Route}
                className={[
                  "flex flex-col items-center justify-center gap-2 border-b border-r border-stone-200 p-3 transition-colors hover:bg-stone-50 md:gap-3 md:p-6",
                  index >= 6 ? "hidden md:flex" : "",
                ]
                  .join(" ")
                  .trim()}
              >
                {brand.logoUrl ? (
                  <div className="relative h-12 w-full md:h-16">
                    <Image
                      src={brand.logoUrl}
                      alt={`Логотип бренда ${brand.name}`}
                      fill
                      sizes="(max-width: 768px) 33vw, 16vw"
                      className="object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <span className="line-clamp-1 text-center text-sm text-stone-600">
                  {brand.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
