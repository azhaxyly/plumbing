"use client";

/**
 * CartClient — client component that manages cart state and mutations.
 * Receives initial cart data from the server component and handles
 * optimistic updates via tRPC mutations.
 */

import { computeTotals } from "@timsan/domain";
import type { Cart } from "@timsan/domain";
import { Button } from "@timsan/ui";
import { ShoppingBag } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";

import { CartItemRow } from "./cart-item-row";

// ─── Price formatter ──────────────────────────────────────────────────────────

function formatPrice(tiyins: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(tiyins / 100);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CartClientProps {
  initialCart: Cart | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CartClient({ initialCart }: CartClientProps) {
  const [cart, setCart] = useState<Cart | null>(initialCart);
  const [, startTransition] = useTransition();

  const items = cart?.items ?? [];
  const isEmpty = items.length === 0;

  // Compute totals only when cart is non-empty
  const totals = isEmpty ? null : computeTotals(items);

  async function handleUpdate(itemId: string, quantity: number) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/trpc/cart.update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ json: { itemId, quantity } }),
        });
        if (res.ok) {
          const data = (await res.json()) as { result?: { data?: { json?: Cart | null } } };
          const updatedCart = data?.result?.data?.json ?? null;
          setCart(updatedCart);
        }
      } catch {
        // Silently fail — user can retry
      }
    });
  }

  async function handleRemove(itemId: string) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/trpc/cart.remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ json: { itemId } }),
        });
        if (res.ok) {
          const data = (await res.json()) as { result?: { data?: { json?: Cart | null } } };
          const updatedCart = data?.result?.data?.json ?? null;
          setCart(updatedCart);
        }
      } catch {
        // Silently fail — user can retry
      }
    });
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShoppingBag className="mb-4 h-16 w-16 text-gray-300" aria-hidden="true" />
        <h2 className="mb-2 text-xl font-semibold text-gray-700">
          Корзина пуста
        </h2>
        <p className="mb-6 text-gray-500">
          Добавьте товары из каталога, чтобы оформить заказ
        </p>
        <Button asChild>
          <Link href={"/category" as Route}>Перейти в каталог</Link>
        </Button>
      </div>
    );
  }

  // ── Cart with items ──────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Items list */}
      <div className="lg:col-span-2">
        <ul aria-label="Товары в корзине">
          {totals?.items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      </div>

      {/* Order summary */}
      <aside className="rounded-xl border bg-gray-50 p-6 h-fit">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Итого
        </h2>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">
              Товары ({totals?.itemCount ?? 0} шт.)
            </dt>
            <dd className="font-medium text-gray-900">
              {totals ? formatPrice(totals.subtotal.amount) : "—"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Доставка</dt>
            <dd className="font-medium text-green-600">Бесплатно</dd>
          </div>
        </dl>

        <div className="my-4 border-t" />

        <div className="flex justify-between text-base font-bold text-gray-900">
          <span>К оплате</span>
          <span>{totals ? formatPrice(totals.subtotal.amount) : "—"}</span>
        </div>

        <Button asChild className="mt-6 w-full" size="lg">
          <Link href={"/checkout" as Route}>Оформить заявку</Link>
        </Button>

        <Button
          asChild
          variant="ghost"
          className="mt-2 w-full text-gray-500"
          size="sm"
        >
          <Link href={"/category" as Route}>Продолжить покупки</Link>
        </Button>
      </aside>
    </div>
  );
}
