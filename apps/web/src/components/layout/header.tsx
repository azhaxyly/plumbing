import type { BrandSummary, CategoryTreeNode } from "@timsan/db";
import { getAllBrands, getCategoryTree } from "@timsan/db";
import { ClipboardList, LayoutDashboard, Mail, Phone, ShoppingCart, User } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { auth } from "@/auth";

import { FavoritesLink } from "./favorites-link";
import { MegaMenu } from "./mega-menu";
import { MobileMenu } from "./mobile-menu";
import { SearchBar } from "./search-bar";
import { StickyHeader } from "./sticky-header";

const topLinks = [
  { href: "/about-us", label: "О компании" },
  { href: "/delivery-info", label: "Доставка и оплата" },
  { href: "/contacts", label: "Контакты" },
];

const phone = process.env["NEXT_PUBLIC_SHOP_PHONE"] ?? "+7 (776) 201-64-66";
const email = process.env["NEXT_PUBLIC_SHOP_EMAIL"] ?? "adilet.timat@gmail.com";

const iconBtn =
  "flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-stone-600 transition-colors hover:bg-accent/10 hover:text-accent";
const iconBtnMobile =
  "flex items-center justify-center rounded-xl p-2 text-stone-600 transition-colors hover:bg-accent/10 hover:text-accent";

export async function Header() {
  let categories: CategoryTreeNode[] | null = null;
  try {
    categories = await getCategoryTree();
  } catch {
    // categories remains null
  }

  let brands: BrandSummary[] | null = null;
  try {
    brands = await getAllBrands();
  } catch {
    // brands remains null
  }

  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = role === "admin" || role === "manager";
  const isAuthenticated = !!session?.user;

  const cartCount = 0;

  return (
    <>
      {/* Top bar — slim navy strip, not sticky → scrolls away. Hidden on mobile (empty there). */}
      <div className="hidden w-full bg-primary text-white/70 md:block">
        <div className="container mx-auto flex min-h-[42px] items-center px-4 text-[13px] md:px-6">
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Вспомогательная навигация"
          >
            {topLinks.map((link, i) => (
              <span key={link.href} className="flex items-center">
                {i > 0 && <span className="mx-1 text-white/25">•</span>}
                <Link
                  href={link.href as Route}
                  className="rounded px-1.5 py-0.5 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-5">
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="flex items-center gap-1.5 font-medium text-white transition-colors hover:text-accent"
            >
              <Phone className="h-3.5 w-3.5 text-accent" />
              {phone}
            </a>
            <a
              href={`mailto:${email}`}
              className="hidden items-center gap-1.5 transition-colors hover:text-white lg:flex"
            >
              <Mail className="h-3.5 w-3.5 text-accent" />
              {email}
            </a>
          </div>
        </div>
      </div>

      {/* Main header row — sticky + scroll-shrink */}
      <StickyHeader>
        <div className="container mx-auto px-3 py-2 transition-[padding] duration-300 group-data-[scrolled=true]:py-1.5 md:px-6 md:py-3 md:group-data-[scrolled=true]:py-2">

          {/* ── Mobile: two rows (< md) ── */}
          <div className="md:hidden">
            <div className="flex items-center justify-between">
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
                  className="h-14 w-auto object-contain"
                  priority
                />
              </Link>

              <div className="flex items-center gap-1">
                {isAdmin ? (
                  <Link href={"/admin" as Route} className={iconBtnMobile} aria-label="Панель администратора">
                    <LayoutDashboard className="h-6 w-6" />
                  </Link>
                ) : isAuthenticated ? (
                  <Link href={"/account" as Route} className={iconBtnMobile} aria-label="Личный кабинет">
                    <User className="h-6 w-6" />
                  </Link>
                ) : (
                  <Link href={"/login" as Route} className={iconBtnMobile} aria-label="Войти">
                    <User className="h-6 w-6" />
                  </Link>
                )}

                <Link
                  href={"/cart" as Route}
                  className={`relative ${iconBtnMobile}`}
                  aria-label={`Корзина${cartCount > 0 ? `, ${cartCount} товаров` : ""}`}
                >
                  <ShoppingCart className="h-6 w-6" />
                  {cartCount > 0 && (
                    <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </Link>
                <MobileMenu categories={categories} brands={brands} />
              </div>
            </div>

            <div className="mt-2">
              <SearchBar />
            </div>
          </div>

          {/* ── Desktop: single row (md+) ── */}
          <div className="hidden items-center gap-4 md:flex">
            {/* Logo */}
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
                className="h-20 w-auto object-contain transition-[height] duration-300 group-data-[scrolled=true]:h-14"
                priority
              />
            </Link>

            {/* Catalog */}
            <MegaMenu categories={categories} brands={brands} />

            {/* Search — size unaffected by scroll */}
            <SearchBar />

            {/* Icons */}
            <div className="flex items-center gap-1">
              {isAdmin ? (
                <Link href={"/admin" as Route} className={iconBtn} aria-label="Панель администратора">
                  <LayoutDashboard className="h-6 w-6" />
                  <span className="hidden text-[12px] font-medium lg:block">Админка</span>
                </Link>
              ) : isAuthenticated ? (
                <Link href={"/account" as Route} className={iconBtn} aria-label="Личный кабинет">
                  <User className="h-6 w-6" />
                  <span className="hidden text-[12px] font-medium lg:block">Кабинет</span>
                </Link>
              ) : (
                <Link href={"/orders" as Route} className={iconBtn} aria-label="Мои заказы">
                  <ClipboardList className="h-6 w-6" />
                  <span className="hidden text-[12px] font-medium lg:block">Заказы</span>
                </Link>
              )}

              <FavoritesLink />

              <Link
                href={"/cart" as Route}
                className={`relative ${iconBtn}`}
                aria-label={`Корзина${cartCount > 0 ? `, ${cartCount} товаров` : ""}`}
              >
                <ShoppingCart className="h-6 w-6" />
                <span className="hidden text-[12px] font-medium lg:block">Корзина</span>
                {cartCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              {!isAuthenticated && !isAdmin && (
                <Link href={"/login" as Route} className={iconBtn} aria-label="Войти">
                  <User className="h-6 w-6" />
                  <span className="hidden text-[12px] font-medium lg:block">Войти</span>
                </Link>
              )}

              <MobileMenu categories={categories} brands={brands} />
            </div>
          </div>

        </div>
      </StickyHeader>
    </>
  );
}
