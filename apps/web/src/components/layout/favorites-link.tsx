"use client";

import { Heart } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { useFavorites } from "@/contexts/favorites-context";

export function FavoritesLink() {
  const { count } = useFavorites();

  return (
    <Link
      href={"/favorites" as Route}
      className="relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-stone-600 transition-colors hover:bg-accent/10 hover:text-accent"
      aria-label={`Избранное${count > 0 ? `, ${count} товаров` : ""}`}
    >
      <Heart className="h-6 w-6" />
      <span className="hidden lg:block text-[12px] font-medium">Избранное</span>
      {count > 0 && (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
