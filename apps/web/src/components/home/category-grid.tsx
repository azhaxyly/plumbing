import { Folder } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import type { CategoryItem } from "@/lib/homepage-data";

interface CategoryGridProps {
  categories: CategoryItem[];
  getHref?: (slug: string) => string;
}

function CategoryCard({ category, href }: { category: CategoryItem; href: string }) {
  const hasChildren = category.children && category.children.length > 0;

  return (
    <Link
      href={href as Route}
      className="group overflow-hidden rounded-xl bg-[#DCDCDC] flex flex-col p-3"
    >
      {/* Title — top-left */}
      <span className="font-semibold text-base text-gray-900 group-hover:text-[#2B7BC8] transition-colors leading-tight mb-2 shrink-0">
        {category.name}
      </span>

      {/* Body */}
      {hasChildren ? (
        <div className="flex flex-1 min-h-0 gap-2">
          <div className="relative flex-1">
            {category.imageUrl ? (
              <Image
                src={category.imageUrl}
                alt={category.name}
                fill
                sizes="(max-width: 768px) 25vw, 12vw"
                className="object-contain object-center"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-stone-300">
                <Folder className="h-10 w-10" />
              </div>
            )}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-x-2 gap-y-1 content-start pt-1">
            {category.children!.slice(0, 6).map((child) => (
              <span
                key={child.id}
                className="text-xs text-gray-500 leading-tight"
              >
                {child.name}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative flex-1 min-h-0">
          {category.imageUrl ? (
            <Image
              src={category.imageUrl}
              alt={category.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-contain object-center p-2"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-300">
              <Folder className="h-12 w-12" />
            </div>
          )}
        </div>
      )}
    </Link>
  );
}

export function CategoryGrid({ categories, getHref }: CategoryGridProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <section className="mt-3">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-3 auto-rows-[200px] md:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              href={getHref ? getHref(category.slug) : `/category/${category.slug}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
