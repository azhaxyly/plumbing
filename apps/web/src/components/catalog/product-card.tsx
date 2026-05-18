import { Button } from "@whitehouse/ui";
import { ShoppingCart, Heart } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

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
}

/** Formats price in tiyins to KZT string */
function formatPrice(tiyins: number): string {
  const kzt = tiyins / 100;
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(kzt);
}

export function ProductCard({ product }: ProductCardProps) {
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
      {/* Discount badge */}
      {hasDiscount && discountPercent > 0 && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
          -{discountPercent}%
        </span>
      )}

      {/* Wishlist button */}
      <button
        type="button"
        aria-label="Добавить в избранное"
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-gray-400 opacity-0 shadow transition-all hover:text-red-500 group-hover:opacity-100"
      >
        <Heart className="h-4 w-4" />
      </button>

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
