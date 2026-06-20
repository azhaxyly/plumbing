"use client";

import type { BrandSummary, CategoryTreeNode } from "@timsan/db";
import {
  ClipboardList,
  Heart,
  Home,
  LayoutDashboard,
  LayoutGrid,
  LogIn,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useFavorites } from "@/contexts/favorites-context";

import { MobileCatalogMenu } from "./mobile-catalog-menu";

interface MobileBottomNavProps {
  categories: CategoryTreeNode[] | null;
  brands: BrandSummary[] | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  cartCount: number;
}

const tabBase =
  "relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors";

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="bg-accent absolute right-1/2 top-0.5 flex h-4 min-w-4 translate-x-3 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function MobileBottomNav({
  categories,
  brands,
  isAdmin,
  isAuthenticated,
  cartCount,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const { count: favCount } = useFavorites();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const color = (active: boolean) => (active ? "text-accent" : "text-stone-500 hover:text-accent");

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(0,0,0,0.06)] md:hidden"
        aria-label="Нижняя навигация"
      >
        <div className="flex h-[52px]">
          {/* Главная */}
          <Link href="/" className={`${tabBase} ${color(isActive("/"))}`}>
            <Home className="h-[22px] w-[22px]" />
            <span>Главная</span>
          </Link>

          {/* Каталог */}
          <button
            type="button"
            onClick={() => setCatalogOpen(true)}
            className={`${tabBase} ${color(catalogOpen)}`}
            aria-label="Открыть каталог"
          >
            <LayoutGrid className="h-[22px] w-[22px]" />
            <span>Каталог</span>
          </button>

          {/* Избранное */}
          <Link
            href={"/favorites" as Route}
            className={`${tabBase} ${color(isActive("/favorites"))}`}
          >
            <Heart className="h-[22px] w-[22px]" />
            <Badge count={favCount} />
            <span>Избранное</span>
          </Link>

          {/* Корзина */}
          <Link href={"/cart" as Route} className={`${tabBase} ${color(isActive("/cart"))}`}>
            <ShoppingCart className="h-[22px] w-[22px]" />
            <Badge count={cartCount} />
            <span>Корзина</span>
          </Link>

          {/* Аккаунт */}
          {isAdmin ? (
            <Link href={"/admin" as Route} className={`${tabBase} ${color(isActive("/admin"))}`}>
              <LayoutDashboard className="h-[22px] w-[22px]" />
              <span>Админка</span>
            </Link>
          ) : isAuthenticated ? (
            <Link
              href={"/account" as Route}
              className={`${tabBase} ${color(isActive("/account"))}`}
            >
              <User className="h-[22px] w-[22px]" />
              <span>Кабинет</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className={`${tabBase} ${color(profileOpen)}`}
              aria-label="Профиль"
            >
              <User className="h-[22px] w-[22px]" />
              <span>Профиль</span>
            </button>
          )}
        </div>
      </nav>

      {/* Catalog mega-menu */}
      <MobileCatalogMenu
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        categories={categories}
        brands={brands}
      />

      {/* Guest profile sheet */}
      {profileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setProfileOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <span className="text-base font-semibold text-stone-800">Профиль</span>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setProfileOpen(false)}
                className="rounded-lg p-1.5 text-stone-500 transition-colors hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col py-2">
              <Link
                href={"/orders" as Route}
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-3 px-5 py-3.5 text-stone-700 transition-colors hover:bg-stone-50"
              >
                <ClipboardList className="text-accent h-5 w-5" />
                <span className="font-medium">Мои заказы</span>
              </Link>
              <Link
                href={"/login" as Route}
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-3 px-5 py-3.5 text-stone-700 transition-colors hover:bg-stone-50"
              >
                <LogIn className="text-accent h-5 w-5" />
                <span className="font-medium">Войти</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
