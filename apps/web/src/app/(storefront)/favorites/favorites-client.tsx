"use client";

import { Heart, ShoppingBag } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ProductCard } from "@/components/catalog/product-card";
import type { ProductCardData } from "@/components/catalog/product-card";
import { useFavorites } from "@/contexts/favorites-context";

export function FavoritesClient() {
  const { productIds, count } = useFavorites();
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Mark as hydrated after first render so we don't flash empty state on SSR
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (productIds.length === 0) {
      setProducts([]);
      return;
    }

    setLoading(true);
    fetch("/api/trpc/favorites.getProducts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: { productIds } }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          result?: { data?: { json?: ProductCardData[] } };
        };
        const items = data?.result?.data?.json ?? [];
        // Preserve order from productIds (newest-first)
        const ordered = productIds
          .map((id) => items.find((p) => p.id === id))
          .filter((p): p is ProductCardData => !!p);
        setProducts(ordered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hydrated, productIds]);

  if (!hydrated) {
    // Avoid hydration mismatch — render nothing on server
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <div className="mb-6 flex items-center gap-3">
        <Heart className="h-6 w-6 text-red-500" />
        <h1 className="text-2xl font-bold text-gray-900">Избранное</h1>
        {count > 0 && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600">
            {count}
          </span>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {!loading && count === 0 && (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <ShoppingBag className="h-16 w-16 text-gray-200" />
          <p className="text-lg font-medium text-gray-500">
            Здесь пока ничего нет
          </p>
          <p className="max-w-sm text-sm text-gray-400">
            Нажмите на сердечко у понравившегося товара, чтобы сохранить его сюда
          </p>
          <Link
            href={"/" as Route}
            className="mt-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
          >
            Перейти в каталог
          </Link>
        </div>
      )}
    </div>
  );
}
