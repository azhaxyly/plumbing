import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Route } from "next";

import type { BrandItem } from "@/lib/homepage-data";

interface BrandsSectionProps {
  brands: BrandItem[];
}

export function BrandsSection({ brands }: BrandsSectionProps) {
  if (!brands || brands.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold sm:text-3xl text-stone-900">
            Популярные бренды
          </h2>
          <Link
            href={"/brand" as Route}
            className="flex items-center text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Смотреть все бренды
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        <div className="border border-stone-200 overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brand/${brand.slug}` as Route}
                className="flex flex-col items-center justify-center gap-3 border-b border-r border-stone-200 p-6 transition-colors hover:bg-stone-50"
              >
                {brand.logoUrl ? (
                  <div className="relative h-16 w-full">
                    <Image
                      src={brand.logoUrl}
                      alt={`Логотип бренда ${brand.name}`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                      className="object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <span className="text-center text-sm text-stone-600 line-clamp-1">
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
