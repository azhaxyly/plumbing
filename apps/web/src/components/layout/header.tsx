import type { BrandSummary, CategoryTreeNode } from "@timsan/db";
import { getAllBrands, getCategoryTree } from "@timsan/db";
import { ClipboardList, LayoutDashboard, Mail, Phone, ShoppingCart, User } from "lucide-react";
import type { Route } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";

import { auth } from "@/auth";
import { CART_GUEST_COOKIE, getGuestCart } from "@/lib/cart-redis";

import { FavoritesLink } from "./favorites-link";
import { MegaMenu } from "./mega-menu";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { SearchBar } from "./search-bar";
import { StickyHeader } from "./sticky-header";

/** Best-effort cart line count for the header badge (server-side, never throws). */
async function getCartCount(userId: string | null): Promise<number> {
  try {
    if (userId) {
      const { prisma } = await import("@timsan/db");
      const cart = await prisma.cart.findFirst({
        where: { userId, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        select: { _count: { select: { items: true } } },
      });
      return cart?._count.items ?? 0;
    }
    const guestId = (await cookies()).get(CART_GUEST_COOKIE)?.value;
    if (!guestId) return 0;
    const cart = await getGuestCart(guestId);
    return cart?.items.length ?? 0;
  } catch {
    return 0;
  }
}

const topLinks = [
  { href: "/about-us", label: "О компании" },
  { href: "/delivery-info", label: "Доставка и оплата" },
  { href: "/contacts", label: "Контакты" },
];

const phone = process.env["NEXT_PUBLIC_SHOP_PHONE"] ?? "+7 (776) 201-64-66";
const email = process.env["NEXT_PUBLIC_SHOP_EMAIL"] ?? "adilet.timat@gmail.com";

const iconBtn =
  "flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-stone-600 transition-colors hover:bg-accent/10 hover:text-accent";

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
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = role === "admin" || role === "manager";
  const isAuthenticated = !!session?.user;

  const cartCount = await getCartCount(userId);

  return (
    <>
      {/* Top bar — slim navy strip, not sticky → scrolls away. Hidden on mobile (empty there). */}
      <div className="bg-primary hidden w-full text-white/70 md:block">
        <div className="container mx-auto flex min-h-[42px] items-center px-4 text-[13px] md:px-6">
          <nav className="hidden items-center gap-1 md:flex" aria-label="Вспомогательная навигация">
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
              className="hover:text-accent flex items-center gap-1.5 font-medium text-white transition-colors"
            >
              <Phone className="text-accent h-3.5 w-3.5" />
              {phone}
            </a>
            <a
              href={`mailto:${email}`}
              className="hidden items-center gap-1.5 transition-colors hover:text-white lg:flex"
            >
              <Mail className="text-accent h-3.5 w-3.5" />
              {email}
            </a>
          </div>
        </div>
      </div>

      {/* Main header row — sticky + scroll-shrink */}
      <StickyHeader>
        <div className="container mx-auto px-3 py-2 transition-[padding] duration-300 group-data-[scrolled=true]:py-1.5 md:px-6 md:py-3 md:group-data-[scrolled=true]:py-2">
          {/* ── Mobile: single row — logo + search (< md) ── */}
          <div className="flex items-center gap-3 md:hidden">
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
                className="h-10 w-auto object-contain"
                priority
              />
            </Link>

            <SearchBar />
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
                <Link
                  href={"/admin" as Route}
                  className={iconBtn}
                  aria-label="Панель администратора"
                >
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
                  <span className="bg-accent absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white">
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
            </div>
          </div>
        </div>
      </StickyHeader>

      {/* Mobile bottom tab bar (< md) */}
      <MobileBottomNav
        categories={categories}
        brands={brands}
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
        cartCount={cartCount}
      />
    </>
  );
}
