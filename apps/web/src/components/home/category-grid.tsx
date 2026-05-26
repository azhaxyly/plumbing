import Image from "next/image";
import Link from "next/link";
import { Folder } from "lucide-react";
import type { Route } from "next";

import { getRootCategories } from "@/lib/homepage-data";

export async function CategoryGrid() {
  const categories = await getRootCategories(12);

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/category/${category.slug}` as Route}
          className="group relative flex aspect-square overflow-hidden rounded-xl bg-stone-100"
        >
          {category.imageUrl ? (
            <Image
              src={category.imageUrl}
              alt={category.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 17vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-stone-300">
              <Folder className="h-12 w-12" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
            <span className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
              {category.name}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
