"use client";

/**
 * CartItemRow — client component for a single cart line item.
 * Handles quantity changes (+/-/direct input) and item removal via tRPC.
 */

import { useState, useTransition } from "react";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@timsan/ui";
import type { CartItemWithTotal } from "@timsan/domain";

// ─── Price formatter ──────────────────────────────────────────────────────────

function formatPrice(tiyins: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(tiyins / 100);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CartItemRowProps {
  item: CartItemWithTotal;
  onUpdate: (itemId: string, quantity: number) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CartItemRow({ item, onUpdate, onRemove }: CartItemRowProps) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [isPending, startTransition] = useTransition();

  function handleQuantityChange(newQty: number) {
    if (newQty < 1) return;
    setQuantity(newQty);
    startTransition(async () => {
      await onUpdate(item.id, newQty);
    });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1) {
      handleQuantityChange(val);
    }
  }

  function handleRemove() {
    startTransition(async () => {
      await onRemove(item.id);
    });
  }

  return (
    <li className="flex gap-4 py-4 border-b last:border-b-0">
      {/* Product image */}
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {item.productImageUrl ? (
          <Image
            src={item.productImageUrl}
            alt={item.productName}
            fill
            sizes="80px"
            className="object-contain p-1"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{item.productName}</p>
        <p className="text-xs text-gray-400">Арт.: {item.productSku}</p>
        <p className="text-sm text-gray-600">
          {formatPrice(item.unitPrice.amount)} / шт.
        </p>

        {/* Quantity controls */}
        <div className="mt-2 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={isPending || quantity <= 1}
            aria-label="Уменьшить количество"
          >
            <Minus className="h-3 w-3" />
          </Button>

          <input
            type="number"
            min={1}
            value={quantity}
            onChange={handleInputChange}
            disabled={isPending}
            className="h-7 w-12 rounded border border-gray-200 text-center text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
            aria-label="Количество"
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={isPending}
            aria-label="Увеличить количество"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Line total + remove */}
      <div className="flex flex-col items-end justify-between flex-shrink-0">
        <p className="font-semibold text-gray-900">
          {formatPrice(item.lineTotal.amount)}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-red-500"
          onClick={handleRemove}
          disabled={isPending}
          aria-label={`Удалить ${item.productName} из корзины`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
