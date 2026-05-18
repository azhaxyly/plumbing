import { Button } from "@whitehouse/ui";
import { Search, Heart, User, ShoppingCart } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { MobileMenu } from "./mobile-menu";

const navLinks = [
  { href: "/category", label: "Каталог" },
  { href: "/brand", label: "Бренды" },
  { href: "/about-us", label: "О нас" },
  { href: "/delivery-info", label: "Доставка" },
  { href: "/contacts", label: "Контакты" },
];

export function Header() {
  // Badge counters — placeholders (will be dynamic in Phase 3)
  const cartCount = 0;
  const favoritesCount = 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-gray-900 hover:text-gray-700 transition-colors"
          aria-label="Whitehouse — на главную"
        >
          <span className="text-2xl font-extrabold">Whitehouse</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Основная навигация">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href as Route}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Icon actions */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Поиск"
            asChild
          >
            <Link href={"/search" as Route}>
              <Search className="h-5 w-5" />
            </Link>
          </Button>

          {/* Favorites */}
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Избранное${favoritesCount > 0 ? `, ${favoritesCount} товаров` : ""}`}
            className="relative"
            asChild
          >
            <Link href={"/favorites" as Route}>
              <Heart className="h-5 w-5" />
              {favoritesCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {favoritesCount > 99 ? "99+" : favoritesCount}
                </span>
              )}
            </Link>
          </Button>

          {/* Profile */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Личный кабинет"
            asChild
          >
            <Link href={"/account" as Route}>
              <User className="h-5 w-5" />
            </Link>
          </Button>

          {/* Cart */}
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Корзина${cartCount > 0 ? `, ${cartCount} товаров` : ""}`}
            className="relative"
            asChild
          >
            <Link href={"/cart" as Route}>
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          </Button>

          {/* Mobile menu toggle */}
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
