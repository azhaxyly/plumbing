import { getCategoryTree, type CategoryTreeNode } from "@timsan/db";
import { ArrowRight, LayoutGrid } from "lucide-react";
import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Каталог товаров",
  description:
    "Весь ассортимент сантехники: ванны, смесители, душевые системы, раковины, унитазы и аксессуары для ванной комнаты.",
  alternates: { canonical: "/category" },
  openGraph: {
    title: "Каталог товаров",
    description:
      "Весь ассортимент сантехники: ванны, смесители, душевые системы, раковины, унитазы и аксессуары для ванной комнаты.",
    url: "/category",
    type: "website",
  },
};

const breadcrumbItems = [
  { name: "Главная", href: "/" },
  { name: "Каталог", href: "/category" },
];

const MAX_CHIPS = 6;
const ACCENT = "#2B7BC8";

export default async function CatalogPage() {
  const categories = await getCategoryTree().catch(() => []);

  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />

      <div className="container mx-auto px-4 py-8 md:px-6">
        {/* Header band */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-sky-50 via-white to-stone-50 px-6 py-7 md:px-8 md:py-9">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-900 md:text-3xl">Каталог товаров</h1>
              <p className="mt-2 text-stone-500">Выберите категорию, чтобы найти нужный товар</p>
            </div>
            {categories.length > 0 && (
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm font-medium text-stone-600 shadow-sm">
                <LayoutGrid className="h-4 w-4" style={{ color: ACCENT }} />
                {categories.length} {pluralizeCategories(categories.length)}
              </span>
            )}
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-300">
              <LayoutGrid className="h-8 w-8" />
            </div>
            <p className="mt-4 text-lg font-medium text-stone-500">Категории не найдены</p>
            <p className="mt-1 text-sm text-stone-400">
              Категории появятся здесь после добавления товаров
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function CategoryCard({ category }: { category: CategoryTreeNode }) {
  const href = `/category/${category.slug}` as Route;
  const children = category.children ?? [];
  const hasChildren = children.length > 0;
  const visibleChildren = children.slice(0, MAX_CHIPS);
  const overflow = children.length - visibleChildren.length;

  // Childless category → whole card is one link.
  if (!hasChildren) {
    return (
      <Link
        href={href}
        className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
      >
        <CardBanner category={category} />
        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <h2 className="text-sm font-bold text-stone-900 transition-colors group-hover:text-[#2B7BC8] sm:text-base">
            {category.name}
          </h2>
          {category.productsCount > 0 && (
            <p className="mt-1 text-xs text-stone-400">
              {category.productsCount} {pluralize(category.productsCount)}
            </p>
          )}
          <span className="mt-auto hidden items-center gap-1 pt-4 text-sm font-semibold text-[#2B7BC8] sm:inline-flex">
            Смотреть товары
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md">
      <Link href={href}>
        <CardBanner category={category} />
      </Link>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex items-baseline justify-between gap-2">
          <Link href={href}>
            <h2 className="text-sm font-bold text-stone-900 transition-colors group-hover:text-[#2B7BC8] sm:text-base">
              {category.name}
            </h2>
          </Link>
          {category.productsCount > 0 && (
            <span className="shrink-0 text-xs text-stone-400">
              {category.productsCount} {pluralize(category.productsCount)}
            </span>
          )}
        </div>

        <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
          {visibleChildren.map((sub) => (
            <Link
              key={sub.id}
              href={`/category/${category.slug}/${sub.slug}` as Route}
              className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-[#2B7BC8] hover:bg-sky-50 hover:text-[#2B7BC8]"
            >
              {sub.name}
            </Link>
          ))}
          {overflow > 0 && (
            <Link
              href={href}
              className="inline-flex items-center rounded-full border border-dashed border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:border-[#2B7BC8] hover:text-[#2B7BC8]"
            >
              +{overflow}
            </Link>
          )}
        </div>

        <Link
          href={href}
          className="mt-auto hidden items-center gap-1 pt-4 text-sm font-semibold text-[#2B7BC8] sm:inline-flex"
        >
          Все товары
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

function CardBanner({ category }: { category: CategoryTreeNode }) {
  return (
    <div className="relative aspect-[16/9] w-full bg-gradient-to-br from-sky-50 to-stone-100">
      {category.imageUrl ? (
        <Image
          src={category.imageUrl}
          alt={category.name}
          fill
          sizes="(max-width: 1280px) 50vw, 33vw"
          className="object-contain p-2 transition-transform duration-300 group-hover:scale-105 sm:p-4"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-stone-300">
          <LayoutGrid className="h-12 w-12" />
        </div>
      )}
    </div>
  );
}

function pluralize(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return "товаров";
  if (mod10 === 1) return "товар";
  if (mod10 >= 2 && mod10 <= 4) return "товара";
  return "товаров";
}

function pluralizeCategories(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return "категорий";
  if (mod10 === 1) return "категория";
  if (mod10 >= 2 && mod10 <= 4) return "категории";
  return "категорий";
}
