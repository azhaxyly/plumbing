import { Button } from "@timsan/ui";
import { ShoppingCart } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { formatPrice } from "@/lib/format-price";

import { WishlistButton } from "./wishlist-button";

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  primaryImageUrl: string | null;
  primaryImageAlt: string;
  brandName: string | null;
  inStock: boolean;
}

interface ProductCardProps {
  product: ProductCardData;
  badge?: "Хит" | "Новинка" | null | undefined;
}


export function ProductCard({ product, badge }: ProductCardProps) {
  const hasDiscount =
    product.compareAtPriceCents !== null &&
    product.compareAtPriceCents > product.priceCents;

  const discountPercent =
    hasDiscount && product.compareAtPriceCents
      ? Math.round(
          (1 - product.priceCents / product.compareAtPriceCents) * 100
        )
      : 0;

  return (
    <article className="group relative flex flex-col rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Badges container */}
      <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-1">
        {/* Discount badge */}
        {hasDiscount && discountPercent > 0 && (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            -{discountPercent}%
          </span>
        )}
        {/* Type badge */}
        {badge && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${
              badge === "Хит" ? "bg-amber-500" : "bg-blue-500"
            }`}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Wishlist button */}
      <WishlistButton
        productId={product.id}
        variant="card"
        className="absolute right-3 top-3 z-10"
      />

      {/* Product image */}
      <Link
        href={`/product/${product.slug}` as Route}
        className="relative block aspect-square overflow-hidden rounded-t-xl bg-gray-50"
        aria-label={product.name}
        tabIndex={-1}
      >
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={product.primaryImageAlt || product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <ShoppingCart className="h-12 w-12" />
          </div>
        )}
      </Link>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Brand */}
        {product.brandName && (
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {product.brandName}
          </p>
        )}

        {/* Name */}
        <Link
          href={`/product/${product.slug}` as Route}
          className="line-clamp-2 text-sm font-medium text-gray-800 hover:text-amber-600 transition-colors"
        >
          {product.name}
        </Link>

        {/* Price */}
        <div className="mt-auto flex items-end gap-2">
          <span className="text-base font-bold text-gray-900">
            {formatPrice(product.priceCents)}
          </span>
          {hasDiscount && product.compareAtPriceCents && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.compareAtPriceCents)}
            </span>
          )}
        </div>

        {/* Stock status */}
        <p
          className={`text-xs font-medium ${
            product.inStock ? "text-green-600" : "text-red-500"
          }`}
        >
          {product.inStock ? "В наличии" : "Нет в наличии"}
        </p>

        {/* Add to cart */}
        <Button
          size="sm"
          className="mt-1 w-full"
          disabled={!product.inStock}
          aria-label={`Добавить ${product.name} в корзину`}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          В корзину
        </Button>
      </div>
    </article>
  );
}
