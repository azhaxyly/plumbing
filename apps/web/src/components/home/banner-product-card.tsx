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
    /*
     * The card is a flex column that fills its CSS grid cell (align-self: stretch
     * is the grid default). No explicit h-full needed — the grid handles it.
     *
     * Structure:
     *   ┌─────────────────────┐  ← card (flex col)
     *   │  [image — flex-1]   │  grows to fill whatever the grid row allows
     *   ├─────────────────────┤
     *   │  name (line-clamp)  │  fixed size, part of footer
     *   │  old price / badge  │
     *   │  current price      │  ← all footer items at the same row-bottom
     *   └─────────────────────┘
     */
    <Link
      href={`/product/${slug}` as Route}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-stone-100 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Discount badge */}
      {hasDiscount && discountPercent > 0 && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          -{discountPercent}%
        </span>
      )}

      {/*
       * Image area — aspect-square sets the height regardless of grid row,
       * giving the flex-1 content section room to expand for name alignment.
       */}
      <div className="relative min-h-0 flex-1 w-full bg-stone-50">
        {primaryImageUrl ? (
          <Image
            src={primaryImageUrl}
            alt={name}
            fill
            sizes="(max-width: 768px) 45vw, 15vw"
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-300">
            <Package className="h-8 w-8" />
          </div>
        )}
      </div>

      {/*
       * Footer — flex-col so name + price stack vertically.
       * flex-1 on this section makes it expand when the card stretches taller
       * than the image, keeping the price block truly at the bottom.
       */}
      <div className="flex flex-1 flex-col p-3">
        {/* Name takes available vertical space, pushing price down */}
        <h3 className="flex-1 text-xs font-medium leading-snug text-stone-800 line-clamp-2 transition-colors group-hover:text-emerald-700">
          {name}
        </h3>

        {/* Price block — always at the bottom of every card in the row */}
        <div className="mt-2 flex flex-col gap-0.5">
          {hasDiscount && compareAtPriceCents && (
            <span className="text-[10px] leading-none text-stone-400 line-through">
              {formatPrice(compareAtPriceCents)}
            </span>
          )}
          <span className="text-sm font-bold leading-none text-red-600">
            {formatPrice(priceCents)}
          </span>
        </div>
      </div>
    </Link>
  );
}
