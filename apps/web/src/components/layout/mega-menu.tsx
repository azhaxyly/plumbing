"use client";

import type { BrandSummary, CategoryTreeNode } from "@timsan/db";
import { ArrowLeft, ChevronDown, LayoutGrid, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface MegaMenuProps {
  categories: CategoryTreeNode[] | null;
  brands: BrandSummary[] | null;
}

type MenuView = "root" | "sub";

const ICON_GRADIENTS = [
  "from-sky-400 to-blue-500",
  "from-blue-400 to-indigo-500",
  "from-cyan-400 to-sky-500",
  "from-teal-400 to-cyan-500",
  "from-indigo-400 to-blue-500",
  "from-sky-400 to-cyan-500",
];

interface CategoryCardProps {
  category: CategoryTreeNode;
  index: number;
  onClick: () => void;
}

function CategoryCard({ category, index, onClick }: CategoryCardProps) {
  const gradient = ICON_GRADIENTS[index % ICON_GRADIENTS.length];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/card flex h-[170px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-stone-200/70 bg-white p-3 text-center shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
    >
      <div className="relative h-28 w-28 shrink-0">
        {category.imageUrl ? (
          <Image
            src={category.imageUrl}
            alt={category.name}
            fill
            sizes="112px"
            className="object-contain mix-blend-multiply transition-transform duration-200 group-hover/card:scale-110"
            unoptimized
          />
        ) : (
          <div
            className={`h-full w-full rounded-xl bg-gradient-to-br ${gradient} opacity-80 transition-opacity duration-200 group-hover/card:opacity-100`}
          />
        )}
      </div>
      <span className="line-clamp-2 text-xs font-semibold leading-tight text-primary transition-colors group-hover/card:text-accent">
        {category.name}
      </span>
    </button>
  );
}

interface BrandCardProps {
  brand: BrandSummary;
  onClick: () => void;
}

function BrandCard({ brand, onClick }: BrandCardProps) {
  return (
    <Link
      href={`/brand/${brand.slug}`}
      onClick={onClick}
      className="group/brand flex h-[88px] flex-col items-center justify-center gap-1.5 rounded-xl border border-stone-200/70 bg-white px-3 py-2 text-center shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
    >
      {brand.logoUrl ? (
        <div className="relative h-9 w-full">
          <Image
            src={brand.logoUrl}
            alt={brand.name}
            fill
            sizes="160px"
            className="object-contain mix-blend-multiply"
            unoptimized
          />
        </div>
      ) : (
        <span className="text-sm font-bold text-primary transition-colors group-hover/brand:text-accent">
          {brand.name}
        </span>
      )}
      {brand.logoUrl && (
        <span className="line-clamp-1 text-[11px] font-medium text-stone-500">
          {brand.name}
        </span>
      )}
    </Link>
  );
}

export function MegaMenu({ categories, brands }: MegaMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<MenuView>("root");
  const [prevView, setPrevView] = useState<MenuView>("root");
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryTreeNode | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setView("root");
    setPrevView("root");
    setSelectedCategory(null);
  }, []);

  const handleToggle = useCallback(() => {
    if (open) {
      close();
    } else {
      setOpen(true);
    }
  }, [open, close]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const allCategories = (categories ?? []).slice(0, 40);
  const allBrands = (brands ?? []).filter((b) => b.productsCount > 0).slice(0, 18);

  const handleRootClick = useCallback(
    (cat: CategoryTreeNode) => {
      if (cat.children.length > 0) {
        setPrevView("root");
        setSelectedCategory(cat);
        setView("sub");
      } else {
        router.push(`/category/${cat.slug}`);
        close();
      }
    },
    [router, close],
  );

  const handleSubClick = useCallback(
    (cat: CategoryTreeNode) => {
      router.push(`/category/${cat.slug}`);
      close();
    },
    [router, close],
  );

  const goBack = useCallback(() => {
    setPrevView("sub");
    setView("root");
    setSelectedCategory(null);
  }, []);

  const slideClass =
    view === "sub"
      ? "animate-slide-in-right"
      : prevView === "sub"
        ? "animate-slide-in-left"
        : "";

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-[filter,box-shadow] duration-200 hover:shadow-md hover:brightness-110"
      >
        <LayoutGrid className="h-4 w-4" />
        Каталог
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Full-screen overlay */}
      <div
        className={`fixed inset-0 z-50 flex flex-col bg-stone-50 will-change-transform transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        {/* Top bar */}
        <div className="flex h-14 shrink-0 items-center border-b border-stone-200 bg-white px-6 shadow-sm">
          {view === "sub" && selectedCategory ? (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-2 text-sm font-medium text-stone-600 transition-colors hover:text-accent"
            >
              <ArrowLeft className="h-4 w-4" />
              Все категории
            </button>
          ) : (
            <span className="flex items-center gap-2 text-sm font-bold text-primary">
              <LayoutGrid className="h-4 w-4 text-accent" />
              Каталог товаров
            </span>
          )}

          <button
            type="button"
            onClick={close}
            aria-label="Закрыть каталог"
            className="ml-auto rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {view === "root" ? (
            <div key="root" className={`container mx-auto px-6 py-6 ${slideClass}`}>
              {allCategories.length === 0 ? (
                <p className="py-16 text-center text-sm text-stone-400">
                  Категории не найдены
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {allCategories.map((cat, i) => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      index={i}
                      onClick={() => handleRootClick(cat)}
                    />
                  ))}
                </div>
              )}

              {/* Brands */}
              {allBrands.length > 0 && (
                <div className="mt-10">
                  <div className="mb-4 flex items-center gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                      Бренды
                    </h3>
                    <div className="h-px flex-1 bg-stone-200" />
                    <Link
                      href="/brand"
                      onClick={close}
                      className="text-xs font-semibold text-accent transition-colors hover:text-primary"
                    >
                      Все бренды →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                    {allBrands.map((brand) => (
                      <BrandCard key={brand.id} brand={brand} onClick={close} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div key="sub" className={`container mx-auto flex gap-6 px-6 py-6 ${slideClass}`}>
              {/* Sidebar */}
              <aside className="w-52 shrink-0">
                <div className="sticky top-0 rounded-2xl border border-stone-200/70 bg-white p-4 shadow-sm">
                  {selectedCategory?.imageUrl && (
                    <div className="relative mb-3 h-28 w-full overflow-hidden rounded-xl">
                      <Image
                        src={selectedCategory.imageUrl}
                        alt={selectedCategory.name}
                        fill
                        sizes="208px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    Раздел
                  </p>
                  <p className="mb-5 text-base font-bold leading-snug text-primary">
                    {selectedCategory?.name}
                  </p>
                  {selectedCategory && (
                    <Link
                      href={`/category/${selectedCategory.slug}`}
                      onClick={close}
                      className="block w-full rounded-xl bg-gradient-to-r from-primary to-accent px-3 py-2 text-center text-xs font-semibold text-white transition-[filter] hover:brightness-110"
                    >
                      Все товары раздела →
                    </Link>
                  )}
                </div>
              </aside>

              {/* Subcategory grid */}
              <div className="flex-1">
                {(selectedCategory?.children ?? []).length === 0 ? (
                  <p className="py-16 text-center text-sm text-stone-400">
                    Нет подкатегорий
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {(selectedCategory?.children ?? []).map((sub, i) => (
                      <CategoryCard
                        key={sub.id}
                        category={sub}
                        index={i}
                        onClick={() => handleSubClick(sub)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
