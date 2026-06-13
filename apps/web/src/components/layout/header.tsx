import type { CategoryTreeNode } from "@timsan/db";
import { getCategoryTree } from "@timsan/db";
import { ClipboardList, LayoutDashboard, Mail, Phone, ShoppingCart, User } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
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
const email = process.env["NEXT_PUBLIC_SHOP_EMAIL"] ?? "adilet.timat@gmail.com";

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
  const isAuthenticated = !!session?.user;

  const cartCount = 0;

  return (
    <>
      {/* Top bar — не sticky, уходит при скролле */}
      <div className="border-b border-stone-100 bg-white w-full">
        <div className="container mx-auto flex min-h-[52px] items-center px-4 md:px-6 text-sm text-stone-500">
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

      {/* Main header row — sticky */}
      <div className="sticky top-0 z-40 border-b border-stone-100 bg-white shadow-sm">
        <div className="container mx-auto px-3 py-2 md:pl-2 md:pr-6 md:py-3">

          {/* ── Mobile: две строки (< md) ── */}
          <div className="md:hidden">
            {/* Строка 1: логотип + корзина + гамбургер */}
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="shrink-0 transition-opacity hover:opacity-80"
                aria-label="Timsan — на главную"
              >
                <Image
                  src="/logo.png"
                  alt="Timsan Сантехника"
                  width={96}
                  height={64}
                  className="h-[64px] w-[96px] object-contain"
                  priority
                />
              </Link>

              <div className="flex items-center gap-1">
                {isAdmin ? (
                  <Link
                    href={"/admin" as Route}
                    className="flex items-center justify-center rounded-lg p-2 text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
                    aria-label="Панель администратора"
                  >
                    <LayoutDashboard className="h-6 w-6" />
                  </Link>
                ) : isAuthenticated ? (
                  <Link
                    href={"/account" as Route}
                    className="flex items-center justify-center rounded-lg p-2 text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
                    aria-label="Личный кабинет"
                  >
                    <User className="h-6 w-6" />
                  </Link>
                ) : (
                  <Link
                    href={"/login" as Route}
                    className="flex items-center justify-center rounded-lg p-2 text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
                    aria-label="Войти"
                  >
                    <User className="h-6 w-6" />
                  </Link>
                )}

                <Link
                  href={"/cart" as Route}
                  className="relative flex items-center justify-center rounded-lg p-2 text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
                  aria-label={`Корзина${cartCount > 0 ? `, ${cartCount} товаров` : ""}`}
                >
                  <ShoppingCart className="h-6 w-6" />
                  {cartCount > 0 && (
                    <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </Link>
                <MobileMenu categories={categories} />
              </div>
            </div>

            {/* Строка 2: поисковая строка */}
            <div className="mt-2">
              <SearchBar />
            </div>
          </div>

          {/* ── Desktop: одна строка (md+) ── */}
          <div className="hidden md:flex min-h-[80px] items-center gap-4">
            {/* Логотип */}
            <Link
              href="/"
              className="shrink-0 transition-opacity hover:opacity-80"
              aria-label="Timsan — на главную"
            >
              <Image
                src="/logo.png"
                alt="Timsan Сантехника"
                width={173}
                height={115}
                className="h-[115px] w-[173px] object-contain"
                priority
              />
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
                  <LayoutDashboard className="h-7 w-7" />
                  <span className="hidden lg:block text-[12px] font-medium">Админка</span>
                </Link>
              ) : isAuthenticated ? (
                <Link
                  href={"/account" as Route}
                  className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
                  aria-label="Личный кабинет"
                >
                  <User className="h-7 w-7" />
                  <span className="hidden lg:block text-[12px] font-medium">Кабинет</span>
                </Link>
              ) : (
                <Link
                  href={"/orders" as Route}
                  className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
                  aria-label="Мои заказы"
                >
                  <ClipboardList className="h-7 w-7" />
                  <span className="hidden lg:block text-[12px] font-medium">Заказы</span>
                </Link>
              )}

              <FavoritesLink />

              <Link
                href={"/cart" as Route}
                className="relative flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
                aria-label={`Корзина${cartCount > 0 ? `, ${cartCount} товаров` : ""}`}
              >
                <ShoppingCart className="h-7 w-7" />
                <span className="hidden lg:block text-[12px] font-medium">Корзина</span>
                {cartCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              {!isAuthenticated && !isAdmin && (
                <Link
                  href={"/login" as Route}
                  className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
                  aria-label="Войти"
                >
                  <User className="h-7 w-7" />
                  <span className="hidden lg:block text-[12px] font-medium">Войти</span>
                </Link>
              )}

              <MobileMenu categories={categories} />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
