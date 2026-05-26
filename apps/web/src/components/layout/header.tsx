import type { CategoryTreeNode } from "@timsan/db";
import { getCategoryTree } from "@timsan/db";
import { LayoutDashboard, Mail, Phone, ShoppingCart, User } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { auth } from "@/auth";
import { MegaMenu } from "./mega-menu";
import { MobileMenu } from "./mobile-menu";
import { SearchBar } from "./search-bar";
import { FavoritesLink } from "./favorites-link";

const topLinks = [
  { href: "/about-us", label: "О компании" },
  { href: "/delivery-info", label: "Доставка и оплата" },
  { href: "/contacts", label: "Контакты" },
];

const phone = process.env["NEXT_PUBLIC_SHOP_PHONE"] ?? "+7 (776) 201-64-66";
const email = process.env["NEXT_PUBLIC_SHOP_EMAIL"] ?? "info@timsan.kz";

export async function Header() {
  let categories: CategoryTreeNode[] | null = null;
  try {
    categories = await getCategoryTree();
  } catch {
    // categories remains null
  }

  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = role === "admin" || role === "manager";

  const cartCount = 0;

  return (
    <header className="sticky top-0 z-40 w-full shadow-sm">
      {/* Top bar */}
      <div className="border-b border-stone-100 bg-white">
        <div className="container mx-auto flex min-h-[36px] items-center px-6 text-xs text-stone-500">
          <nav className="hidden items-center gap-5 md:flex" aria-label="Вспомогательная навигация">
            {topLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href as Route}
                className="transition-colors hover:text-stone-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-5">
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="flex items-center gap-1.5 font-medium text-stone-700 transition-colors hover:text-stone-900"
            >
              <Phone className="h-3 w-3" />
              {phone}
            </a>
            <a
              href={`mailto:${email}`}
              className="hidden items-center gap-1.5 transition-colors hover:text-stone-900 lg:flex"
            >
              <Mail className="h-3 w-3" />
              {email}
            </a>
          </div>
        </div>
      </div>

      {/* Main header row */}
      <div className="border-b border-stone-100 bg-white">
        <div className="container mx-auto flex min-h-[80px] items-center gap-5 px-6">
          {/* Logo */}
          <Link
            href="/"
            className="shrink-0 text-2xl font-extrabold tracking-tight transition-colors hover:opacity-80"
            aria-label="Timsan — на главную"
          >
            <span className="text-stone-800">WHITE</span>
            <span className="text-emerald-700">HOUSE</span>
          </Link>

          {/* Каталог */}
          <MegaMenu categories={categories} />

          {/* Search */}
          <SearchBar />

          {/* Icons */}
          <div className="flex items-center gap-1">
            {isAdmin ? (
              <Link
                href={"/admin" as Route}
                className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
                aria-label="Панель администратора"
              >
                <LayoutDashboard className="h-6 w-6" />
                <span className="text-[11px] font-medium">Админка</span>
              </Link>
            ) : (
              <Link
                href={"/account" as Route}
                className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
                aria-label="Личный кабинет"
              >
                <User className="h-6 w-6" />
                <span className="text-[11px] font-medium">Кабинет</span>
              </Link>
            )}

            <FavoritesLink />

            <Link
              href={"/cart" as Route}
              className="relative flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
              aria-label={`Корзина${cartCount > 0 ? `, ${cartCount} товаров` : ""}`}
            >
              <ShoppingCart className="h-6 w-6" />
              <span className="text-[11px] font-medium">Корзина</span>
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-700 text-[10px] font-bold text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            <MobileMenu categories={categories} />
          </div>
        </div>
      </div>
    </header>
  );
}
