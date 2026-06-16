"use client";

import { Button, Input } from "@timsan/ui";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";


import {
  addBestsellerProductAction,
  removeBestsellerProductAction,
  reorderBestsellerProductsAction,
  searchProductsForBestsellerAction,
} from "@/lib/bestseller-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductSearchResult {
  id: string;
  name: string;
  priceCents: number;
  slug: string;
  images: { url: string }[];
}

interface BestsellerItemData {
  id: string;
  productId: string;
  position: number;
  product: {
    id: string;
    name: string;
    slug: string;
    priceCents: number;
    images: { url: string }[];
  };
}

interface BestsellersClientProps {
  initialItems: BestsellerItemData[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BestsellersClient({ initialItems }: BestsellersClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<BestsellerItemData[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const existingProductIds = new Set(items.map((i) => i.productId));

  // ─── Search ────────────────────────────────────────────────────────────

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimeout.current = setTimeout(() => {
      void (async () => {
        setIsSearching(true);
        const result = await searchProductsForBestsellerAction(q.trim());
        setIsSearching(false);
        if (result.data) setSearchResults(result.data);
      })();
    }, 300);
  }, []);

  // ─── Add product ───────────────────────────────────────────────────────

  const handleAdd = useCallback(
    (product: ProductSearchResult) => {
      if (existingProductIds.has(product.id)) return;
      startTransition(async () => {
        setError(null);
        const result = await addBestsellerProductAction(product.id);
        if (result.error) {
          setError(result.error);
          return;
        }
        setItems((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            productId: product.id,
            position: prev.length,
            product: {
              id: product.id,
              name: product.name,
              slug: product.slug,
              priceCents: product.priceCents,
              images: product.images,
            },
          },
        ]);
        setSearchQuery("");
        setSearchResults([]);
        router.refresh();
      });
    },
    [existingProductIds, router],
  );

  // ─── Remove product ────────────────────────────────────────────────────

  const handleRemove = useCallback(
    (productId: string) => {
      startTransition(async () => {
        setError(null);
        const result = await removeBestsellerProductAction(productId);
        if (result.error) {
          setError(result.error);
          return;
        }
        setItems((prev) => {
          const updated = prev
            .filter((i) => i.productId !== productId)
            .map((i, idx) => ({ ...i, position: idx }));
          return updated;
        });
        router.refresh();
      });
    },
    [router],
  );

  // ─── Reorder ───────────────────────────────────────────────────────────

  const handleMove = useCallback(
    (productId: string, direction: "up" | "down") => {
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.productId === productId);
        if (idx === -1) return prev;
        const newIdx = direction === "up" ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= prev.length) return prev;
        const updated = [...prev];
        const e1 = updated[newIdx];
        const e2 = updated[idx];
        if (e1 !== undefined && e2 !== undefined) { updated[idx] = e1; updated[newIdx] = e2; }
        const reordered = updated.map((item, i) => ({ ...item, position: i }));

        startTransition(async () => {
          setError(null);
          const result = await reorderBestsellerProductsAction(
            reordered.map((i) => i.productId),
          );
          if (result.error) setError(result.error);
          else router.refresh();
        });

        return reordered;
      });
    },
    [router],
  );

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Найти товар для добавления..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
            {searchResults.map((product) => {
              const alreadyAdded = existingProductIds.has(product.id);
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={alreadyAdded || isPending}
                  onClick={() => handleAdd(product)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-100">
                    {product.images[0] ? (
                      <Image
                        src={product.images[0].url}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatPrice(product.priceCents)}
                    </p>
                  </div>
                  {alreadyAdded && (
                    <span className="text-xs text-gray-400">Уже добавлен</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Items list */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
          Список хитов пуст. Добавьте товары через поиск выше.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  #
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Товар
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Цена
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">
                  Порядок
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => (
                <tr key={item.productId} className="bg-white">
                  <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-100">
                        {item.product.images[0] ? (
                          <Image
                            src={item.product.images[0].url}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <span className="font-medium text-gray-900">
                        {item.product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatPrice(item.product.priceCents)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={idx === 0 || isPending}
                        onClick={() => handleMove(item.productId, "up")}
                        title="Переместить вверх"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={idx === items.length - 1 || isPending}
                        onClick={() => handleMove(item.productId, "down")}
                        title="Переместить вниз"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      onClick={() => handleRemove(item.productId)}
                      className="text-red-500 hover:bg-red-50 hover:text-red-700"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length > 0 && (
        <p className="text-xs text-gray-400">
          {items.length} товар{items.length === 1 ? "" : items.length < 5 ? "а" : "ов"} в списке хитов
        </p>
      )}
    </div>
  );
}
