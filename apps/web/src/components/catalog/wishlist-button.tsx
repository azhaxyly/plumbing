"use client";

import { Button , cn } from "@timsan/ui";
import { Heart } from "lucide-react";

import { useFavorites } from "@/contexts/favorites-context";

interface WishlistButtonProps {
  productId: string;
  /** "page" — full button on product detail page; "card" — icon-only on product card */
  variant?: "page" | "card";
  className?: string;
}

export function WishlistButton({
  productId,
  variant = "card",
  className,
}: WishlistButtonProps) {
  const { toggle, isFavorite } = useFavorites();
  const favorited = isFavorite(productId);

  if (variant === "page") {
    return (
      <Button
        type="button"
        variant="outline"
        size="lg"
        aria-label={favorited ? "Убрать из избранного" : "Добавить в избранное"}
        className={cn(
          "px-4 transition-colors",
          favorited && "border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600",
          className,
        )}
        onClick={() => toggle(productId)}
      >
        <Heart className={cn("h-5 w-5", favorited && "fill-current")} />
      </Button>
    );
  }

  // card variant — small floating button shown on hover
  return (
    <button
      type="button"
      aria-label={favorited ? "Убрать из избранного" : "Добавить в избранное"}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow transition-all",
        // On touch devices the heart is always visible. The hover-reveal
        // (opacity-0 → group-hover) is gated to hover-capable devices, otherwise
        // the first tap on a card is consumed as "hover" (revealing the heart)
        // instead of following the product link — forcing a second tap.
        favorited
          ? "text-red-500 opacity-100"
          : "text-gray-400 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100",
        className,
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
    >
      <Heart className={cn("h-4 w-4", favorited && "fill-current")} />
    </button>
  );
}
