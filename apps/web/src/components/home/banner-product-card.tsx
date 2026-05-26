import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import type { Route } from "next";

import { formatPrice } from "@/lib/format-price";

interface BannerProductCardProps {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  primaryImageUrl: string | null;
}

export function BannerProductCard({
  slug,
  name,
  priceCents,
  compareAtPriceCents,
  primaryImageUrl,
}: BannerProductCardProps) {
  const hasDiscount =
    compareAtPriceCents !== null && compareAtPriceCents > priceCents;
  const discountPercent =
    hasDiscount && compareAtPriceCents
      ? Math.round((1 - priceCents / compareAtPriceCents) * 100)
      : 0;

  return (
    <Link
      href={`/product/${slug}` as Route}
      className="group relative flex w-full min-w-[140px] flex-col overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md border"
    >
      {/* Discount badge */}
      {hasDiscount && discountPercent > 0 && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
          -{discountPercent}%
        </span>
      )}

      {/* Image container */}
      <div className="relative aspect-square w-full bg-stone-50">
        {primaryImageUrl ? (
          <Image
            src={primaryImageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 40vw, 20vw"
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-300">
            <Package className="h-8 w-8" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-xs font-medium text-stone-800 transition-colors group-hover:text-emerald-700">
          {name}
        </h3>
        
        <div className="mt-auto pt-2 flex flex-col">
          {hasDiscount && compareAtPriceCents && (
            <span className="text-[10px] text-stone-400 line-through">
              {formatPrice(compareAtPriceCents)}
            </span>
          )}
          <span className="text-sm font-bold text-red-600">
            {formatPrice(priceCents)}
          </span>
        </div>
      </div>
    </Link>
  );
}
