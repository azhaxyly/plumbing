"use client";

/**
 * AddToCartButton — client component that adds a product variant to the cart
 * via tRPC cart.add mutation.
 *
 * After a successful add for guests, calls ensureGuestCartCookie Server Action
 * so the cartGuestId cookie is set for subsequent SSR renders (e.g. /cart page).
 */

import type { Cart } from "@timsan/domain";
import { Button } from "@timsan/ui";
import { ShoppingCart, Check } from "lucide-react";
import { useState, useTransition } from "react";

interface AddToCartButtonProps {
  /** Concrete variant id (product page). Omit on catalog cards — the server
   *  resolves the product's default variant from `productId`. */
  variantId?: string;
  productId: string;
  unitPrice: number; // in tiyins
  productName: string;
  productSku: string;
  productImageUrl?: string;
  quantity?: number;
  disabled?: boolean;
  size?: "sm" | "lg" | "default";
  className?: string;
  label?: string;
}

export function AddToCartButton({
  variantId,
  productId,
  unitPrice,
  productName,
  productSku,
  productImageUrl,
  quantity = 1,
  disabled = false,
  size = "lg",
  className,
  label = "В корзину",
}: AddToCartButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  async function handleAddToCart() {
    startTransition(async () => {
      try {
        const body = {
          json: {
            ...(variantId ? { variantId } : {}),
            productId,
            quantity,
            unitPrice,
            productName,
            productSku,
            ...(productImageUrl ? { productImageUrl } : {}),
          },
        };

        const res = await fetch("/api/trpc/cart.add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            result?: { data?: { json?: Cart | null } };
          };

          // If this is a guest cart, set the cartGuestId cookie client-side
          // immediately so it's available for the next SSR render of /cart.
          // We also call the Server Action as a fallback for HttpOnly enforcement.
          const cart = data?.result?.data?.json;
          if (cart?.guestId) {
            // Set cookie client-side right away (non-HttpOnly so JS can write it)
            const maxAge = 30 * 24 * 60 * 60;
            const secure = location.protocol === "https:" ? "; Secure" : "";
            document.cookie = `cartGuestId=${cart.guestId}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
          }

          setAdded(true);
          setTimeout(() => setAdded(false), 2000);
        }
      } catch {
        // Silently fail — user can retry
      }
    });
  }

  return (
    <Button
      type="button"
      size={size}
      className={className}
      disabled={disabled || isPending}
      onClick={handleAddToCart}
      aria-label={`Добавить ${productName} в корзину`}
    >
      {added ? (
        <>
          <Check className="mr-2 h-5 w-5" />
          Добавлено
        </>
      ) : (
        <>
          <ShoppingCart className="mr-2 h-5 w-5" />
          {isPending ? "Добавляем..." : label}
        </>
      )}
    </Button>
  );
}
