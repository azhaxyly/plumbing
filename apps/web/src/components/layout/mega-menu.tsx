"use client";

import type { CategoryTreeNode } from "@timsan/db";
import { ArrowLeft, LayoutGrid, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface MegaMenuProps {
  categories: CategoryTreeNode[] | null;
}

type MenuView = "root" | "sub";

const ICON_GRADIENTS = [
  "from-sky-400 to-blue-500",
  "from-blue-400 to-indigo-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500",
  "from-cyan-400 to-sky-500",
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
      className="group flex h-[170px] w-full flex-col items-center justify-center gap-2.5 rounded-xl border border-stone-100 bg-[#f5f4f2] p-3 text-center transition-[border-color,background-color,box-shadow] duration-150 hover:border-accent/30 hover:bg-accent/5 hover:shadow-md"
    >
      <div className="relative h-28 w-28 shrink-0">
        {category.imageUrl ? (
          <Image
            src={category.imageUrl}
            alt={category.name}
            fill
            sizes="112px"
            className="object-contain mix-blend-multiply transition-transform duration-200 group-hover:scale-110"
            unoptimized
          />
        ) : (
          <div
            className={`h-full w-full bg-gradient-to-br ${gradient} opacity-75 transition-opacity duration-150 group-hover:opacity-100`}
          />
        )}
      </div>
      <span className="line-clamp-2 text-xs font-medium leading-tight text-stone-700 group-hover:text-primary">
        {category.name}
      </span>
    </button>
  );
}

export function MegaMenu({ categories }: MegaMenuProps) {
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
        className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
          open
            ? "bg-primary/90 text-white"
            : "bg-primary text-white hover:bg-primary/90"
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
        Каталог
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
            <span className="text-sm font-semibold text-stone-800">
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
            </div>
          ) : (
            <div key="sub" className={`container mx-auto flex gap-6 px-6 py-6 ${slideClass}`}>
              {/* Sidebar */}
              <aside className="w-52 shrink-0">
                <div className="sticky top-0 rounded-xl border border-stone-100 bg-white p-4 shadow-sm">
                  {selectedCategory?.imageUrl && (
                    <div className="relative mb-3 h-28 w-full overflow-hidden rounded-lg">
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
                  <p className="mb-5 text-base font-bold leading-snug text-stone-900">
                    {selectedCategory?.name}
                  </p>
                  {selectedCategory && (
                    <Link
                      href={`/category/${selectedCategory.slug}`}
                      onClick={close}
                      className="block w-full rounded-lg bg-accent px-3 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-accent/90"
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
