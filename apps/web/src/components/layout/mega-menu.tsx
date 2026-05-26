"use client";

import type { CategoryTreeNode } from "@timsan/db";
import { ChevronRight, LayoutGrid, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface MegaMenuProps {
  categories: CategoryTreeNode[] | null;
}

export function MegaMenu({ categories }: MegaMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryTreeNode | null>(
    categories?.[0] ?? null,
  );
  const [panelTop, setPanelTop] = useState(0);

  const buttonRef = useRef<HTMLButtonElement>(null);

  const computeTop = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPanelTop(Math.round(rect.bottom));
    }
  }, []);

  const handleButtonClick = useCallback(() => {
    computeTop();
    setOpen((prev) => !prev);
  }, [computeTop]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const allCategories = (categories ?? []).slice(0, 30);
  const subcategories = (activeCategory?.children ?? []).slice(0, 30);

  return (
    <>
      {/* Trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleButtonClick}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
          open
            ? "bg-emerald-800 text-white"
            : "bg-emerald-700 text-white hover:bg-emerald-800"
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
        Каталог
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Full-width dropdown panel */}
      <div
        style={{ top: panelTop }}
        className={`fixed left-0 right-0 z-50 border-t border-stone-200 bg-white shadow-2xl transition-all duration-200 ease-out ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="container mx-auto flex h-[500px] px-6">
          {/* Left: category list */}
          <div className="w-64 shrink-0 overflow-y-auto border-r border-stone-100 py-3">
            {allCategories.length === 0 ? (
              <p className="px-4 py-3 text-sm text-stone-400">
                Категории не найдены
              </p>
            ) : (
              <ul>
                {allCategories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/category/${cat.slug}`}
                      onClick={() => setOpen(false)}
                      onMouseEnter={() => setActiveCategory(cat)}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                        activeCategory?.id === cat.id
                          ? "border-l-2 border-emerald-600 bg-emerald-50 font-semibold text-emerald-800"
                          : "border-l-2 border-transparent text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                      }`}
                    >
                      <span>{cat.name}</span>
                      {cat.children.length > 0 && (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right: subcategory panel */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeCategory && (
              <>
                <div className="mb-5 flex items-baseline gap-3 border-b border-stone-100 pb-3">
                  <h3 className="text-lg font-bold text-stone-800">
                    {activeCategory.name}
                  </h3>
                  <Link
                    href={`/category/${activeCategory.slug}`}
                    onClick={() => setOpen(false)}
                    className="text-xs text-emerald-600 hover:underline"
                  >
                    Все товары →
                  </Link>
                </div>

                {subcategories.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3 xl:grid-cols-4">
                    {subcategories.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/category/${sub.slug}`}
                        onClick={() => setOpen(false)}
                        className="group flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 p-2.5 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:shadow-sm"
                      >
                        <div className="h-[50px] w-[50px] shrink-0 rounded-lg bg-gradient-to-br from-stone-200 to-stone-300 transition-colors group-hover:from-emerald-100 group-hover:to-emerald-200" />
                        <span className="line-clamp-2 text-xs font-medium leading-tight text-stone-700 group-hover:text-emerald-800">
                          {sub.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center text-sm text-stone-400">
                    Нет подкатегорий — смотреть все товары
                  </div>
                )}
              </>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Закрыть каталог"
            className="absolute right-4 top-4 rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
