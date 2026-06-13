"use client";

import { ShoppingCart } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { AddToCartButton } from "./add-to-cart-button";
import { WishlistButton } from "./wishlist-button";

import { BRAND_COUNTRY } from "@/lib/brand-country";
import { formatPrice } from "@/lib/format-price";

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  sku: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  primaryImageUrl: string | null;
  primaryImageAlt: string;
  brandName: string | null;
  brandSlug: string | null;
  inStock: boolean;
  imageUrls?: string[];
}

interface ProductCardProps {
  product: ProductCardData;
  badge?: "Хит" | "Новинка" | null | undefined;
}


export function ProductCard({ product, badge }: ProductCardProps) {
  const noPriceSet = !product.priceCents || product.priceCents <= 0;

  const images = product.imageUrls && product.imageUrls.length > 0
    ? product.imageUrls
    : product.primaryImageUrl
    ? [product.primaryImageUrl]
    : [];

  const [activeIndex, setActiveIndex] = useState(0);

  const hasDiscount =
    product.compareAtPriceCents !== null &&
    product.compareAtPriceCents > product.priceCents;

  const discountPercent =
    hasDiscount && product.compareAtPriceCents
      ? Math.round(
          (1 - product.priceCents / product.compareAtPriceCents) * 100
        )
      : 0;

  function handleMouseMove(e: React.MouseEvent<HTMLAnchorElement>) {
    if (images.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const zone = Math.floor(((e.clientX - rect.left) / rect.width) * images.length);
    setActiveIndex(Math.min(zone, images.length - 1));
  }

  return (
    <article className="group relative flex flex-col rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Badges container */}
      <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-1">
        {hasDiscount && discountPercent > 0 && (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            -{discountPercent}%
          </span>
        )}
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
        className="relative block aspect-[4/3] overflow-hidden rounded-t-xl bg-gray-50"
        aria-label={product.name}
        tabIndex={-1}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setActiveIndex(0)}
      >
        {images.length > 0 ? (
          <>
            {images.map((url, i) => (
              <Image
                key={url}
                src={url}
                alt={i === 0 ? (product.primaryImageAlt || product.name) : product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={`object-contain p-4 transition-opacity duration-150 ${
                  i === activeIndex ? "opacity-100" : "opacity-0"
                }`}
                loading={i === 0 ? "eager" : "lazy"}
              />
            ))}
            {images.length > 1 && (
              <div className="absolute bottom-1.5 left-2 right-2 z-10 flex gap-0.5">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`h-0.5 flex-1 rounded-full transition-colors duration-150 ${
                      i === activeIndex ? "bg-gray-600" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <ShoppingCart className="h-12 w-12" />
          </div>
        )}
      </Link>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {(() => {
          const bc = product.brandSlug ? BRAND_COUNTRY[product.brandSlug] : undefined;
          return bc ? (
            <div className="flex items-center gap-1.5 min-h-[1rem]">
              <span className={`fi fi-${bc.countryCode}`} style={{ width: 20, height: 15, display: "inline-block", borderRadius: 2 }} />
              <span className="text-xs font-semibold text-gray-600">{bc.country}</span>
            </div>
          ) : (
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 min-h-[1rem]">
              {product.brandName ?? " "}
            </p>
          );
        })()}

        <Link
          href={`/product/${product.slug}` as Route}
          className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-gray-800 hover:text-amber-600 transition-colors"
        >
          {product.name}
        </Link>

        <div className="mt-auto flex items-end gap-2">
          {noPriceSet ? (
            <span className="text-sm font-medium text-gray-400">Цена по запросу</span>
          ) : (
            <>
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(product.priceCents)}
              </span>
              <span className={`text-sm line-through text-red-400 ${(!hasDiscount || !product.compareAtPriceCents) ? "invisible" : ""}`}>
                {product.compareAtPriceCents ? formatPrice(product.compareAtPriceCents) : " "}
              </span>
            </>
          )}
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            product.inStock
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-600"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              product.inStock ? "bg-green-500" : "bg-red-400"
            }`}
          />
          {product.inStock ? "В наличии" : "Нет в наличии"}
        </span>

        <AddToCartButton
          variantId={product.id}
          productId={product.id}
          unitPrice={product.priceCents}
          productName={product.name}
          productSku={product.sku}
          productImageUrl={product.primaryImageUrl ?? undefined}
          size="sm"
          className="mt-1 w-full bg-[#2B7BC8] text-white hover:bg-[#2568a8]"
          disabled={!product.inStock}
        />
      </div>
    </article>
  );
}
