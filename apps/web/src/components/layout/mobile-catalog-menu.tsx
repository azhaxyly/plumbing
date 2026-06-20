"use client";

import type { BrandSummary, CategoryTreeNode } from "@timsan/db";
import { ArrowLeft, ChevronRight, LayoutGrid, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface MobileCatalogMenuProps {
  open: boolean;
  onClose: () => void;
  categories: CategoryTreeNode[] | null;
  brands: BrandSummary[] | null;
}

const ICON_GRADIENTS = [
  "from-sky-400 to-blue-500",
  "from-blue-400 to-indigo-500",
  "from-cyan-400 to-sky-500",
  "from-teal-400 to-cyan-500",
  "from-indigo-400 to-blue-500",
  "from-sky-400 to-cyan-500",
];

function CategoryCard({
  category,
  index,
  onClick,
}: {
  category: CategoryTreeNode;
  index: number;
  onClick: () => void;
}) {
  const gradient = ICON_GRADIENTS[index % ICON_GRADIENTS.length];
  const hasChildren = category.children.length > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-[124px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-stone-200/70 bg-white p-2 text-center shadow-sm transition-transform active:scale-[0.97]"
    >
      {hasChildren && (
        <ChevronRight className="absolute right-1.5 top-1.5 h-4 w-4 text-stone-300" />
      )}
      <div className="relative h-16 w-16 shrink-0">
        {category.imageUrl ? (
          <Image
            src={category.imageUrl}
            alt={category.name}
            fill
            sizes="64px"
            className="object-contain mix-blend-multiply"
            unoptimized
          />
        ) : (
          <div className={`h-full w-full rounded-xl bg-gradient-to-br ${gradient} opacity-80`} />
        )}
      </div>
      <span className="text-primary line-clamp-2 text-[11px] font-semibold leading-tight">
        {category.name}
      </span>
    </button>
  );
}

export function MobileCatalogMenu({ open, onClose, categories, brands }: MobileCatalogMenuProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<CategoryTreeNode | null>(null);

  const close = useCallback(() => {
    onClose();
    setSelected(null);
  }, [onClose]);

  // Reset to root whenever the menu (re)opens
  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const go = useCallback(
    (slug: string) => {
      router.push(`/category/${slug}`);
      close();
    },
    [router, close],
  );

  const rootCategories = (categories ?? []).slice(0, 40);
  const visibleBrands = (brands ?? []).filter((b) => b.productsCount > 0).slice(0, 12);

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col bg-stone-50 transition-[opacity,transform] duration-200 ease-out md:hidden ${
        open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center border-b border-stone-200 bg-white px-4 shadow-sm">
        {selected ? (
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="active:text-accent flex items-center gap-1.5 text-sm font-medium text-stone-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Все категории
          </button>
        ) : (
          <span className="text-primary flex items-center gap-2 text-sm font-bold">
            <LayoutGrid className="text-accent h-4 w-4" />
            Каталог товаров
          </span>
        )}
        <button
          type="button"
          onClick={close}
          aria-label="Закрыть каталог"
          className="ml-auto rounded-full p-1.5 text-stone-400 active:bg-stone-100 active:text-stone-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        {selected ? (
          <>
            <div className="mb-3 px-1">
              <p className="text-primary text-base font-bold">{selected.name}</p>
              <Link
                href={`/category/${selected.slug}`}
                onClick={close}
                className="text-accent active:text-primary text-xs font-semibold"
              >
                Все товары раздела →
              </Link>
            </div>
            {selected.children.length === 0 ? (
              <p className="py-12 text-center text-sm text-stone-400">Нет подкатегорий</p>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                {selected.children.map((sub, i) => (
                  <CategoryCard
                    key={sub.id}
                    category={sub}
                    index={i}
                    onClick={() => go(sub.slug)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {rootCategories.length === 0 ? (
              <p className="py-12 text-center text-sm text-stone-400">Категории не найдены</p>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                {rootCategories.map((cat, i) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    index={i}
                    onClick={() => (cat.children.length > 0 ? setSelected(cat) : go(cat.slug))}
                  />
                ))}
              </div>
            )}

            {visibleBrands.length > 0 && (
              <div className="mt-8">
                <div className="mb-3 flex items-center gap-3 px-1">
                  <h3 className="text-primary text-xs font-bold uppercase tracking-wider">
                    Бренды
                  </h3>
                  <div className="h-px flex-1 bg-stone-200" />
                  <Link
                    href="/brand"
                    onClick={close}
                    className="text-accent active:text-primary text-xs font-semibold"
                  >
                    Все →
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {visibleBrands.map((brand) => (
                    <Link
                      key={brand.id}
                      href={`/brand/${brand.slug}`}
                      onClick={close}
                      className="flex h-[70px] items-center justify-center rounded-xl border border-stone-200/70 bg-white px-2 text-center shadow-sm active:scale-[0.97]"
                    >
                      {brand.logoUrl ? (
                        <div className="relative h-8 w-full">
                          <Image
                            src={brand.logoUrl}
                            alt={brand.name}
                            fill
                            sizes="120px"
                            className="object-contain mix-blend-multiply"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <span className="text-primary line-clamp-2 text-[11px] font-bold">
                          {brand.name}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
