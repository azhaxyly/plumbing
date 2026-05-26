import Image from "next/image";
import Link from "next/link";
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
    <section className="py-8 md:py-12 bg-stone-50">
      <div className="container mx-auto px-4">
        <h2 className="mb-6 text-2xl font-bold sm:text-3xl text-stone-900 text-center">
          Наши бренды
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brand/${brand.slug}` as Route}
              className="group flex flex-col items-center justify-center rounded-xl bg-white border border-stone-200 p-4 transition-all hover:border-emerald-200 hover:shadow-md aspect-square"
            >
              {brand.logoUrl ? (
                <div className="relative h-full w-full flex-1">
                  <Image
                    src={brand.logoUrl}
                    alt={`Логотип бренда ${brand.name}`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 17vw"
                    className="object-contain"
                    loading="lazy"
                  />
                </div>
              ) : null}
              <span className="mt-3 text-sm font-medium text-stone-700 text-center line-clamp-1">
                {brand.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
