import { prisma } from "@timsan/db";
import type { Metadata , Route } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/catalog/product-card";
import type { ProductCardData } from "@/components/catalog/product-card";

export const dynamic = "force-dynamic";

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type SortType = "popular" | "newest" | null;

function resolveSortAndSale(
  rawParams: Record<string, string | string[] | undefined>,
): { sort: SortType; sale: boolean } {
  const sort = typeof rawParams["sort"] === "string" ? rawParams["sort"] : null;
  const sale = rawParams["sale"] === "true";
  return {
    sort: sort === "popular" || sort === "newest" ? sort : null,
    sale,
  };
}

function pageTitle(sort: SortType, sale: boolean): string {
  if (sale) return "Распродажа";
  if (sort === "popular") return "Хиты продаж";
  if (sort === "newest") return "Новинки";
  return "Каталог";
}

export async function generateMetadata({
  searchParams,
}: CatalogPageProps): Promise<Metadata> {
  const raw = await searchParams;
  const { sort, sale } = resolveSortAndSale(raw);
  const title = pageTitle(sort, sale);
  return { title, robots: { index: false, follow: true } };
}

async function getBestsellerProducts(): Promise<ProductCardData[]> {
  const items = await prisma.bestsellerItem.findMany({
    orderBy: { position: "asc" },
    where: { product: { status: "active" } },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          sku: true,
          priceCents: true,
          compareAtPriceCents: true,
          brand: { select: { name: true, slug: true } },
          images: {
            where: { isPrimary: true },
            select: { url: true, alt: true },
            take: 1,
          },
          variants: { select: { quantity: true, reserved: true } },
        },
      },
    },
  });
  return items.map(({ product: p }) => {
    const img = p.images[0] ?? null;
    const available = p.variants.reduce(
      (sum, v) => sum + (v.quantity - v.reserved),
      0,
    );
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      priceCents: p.priceCents,
      compareAtPriceCents: p.compareAtPriceCents,
      primaryImageUrl: img?.url ?? null,
      primaryImageAlt: img?.alt ?? p.name,
      brandName: p.brand?.name ?? null,
      brandSlug: p.brand?.slug ?? null,
      inStock: available > 0,
    };
  });
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const raw = await searchParams;
  const { sort, sale } = resolveSortAndSale(raw);
  const title = pageTitle(sort, sale);

  let products: ProductCardData[];

  if (sort === "popular") {
    products = await getBestsellerProducts();
  } else {
    const orderBy = { createdAt: "desc" } as const;
    const whereExtra = sale ? { compareAtPriceCents: { not: null as null } } : {};

    const rows = await prisma.product.findMany({
      where: { status: "active", ...whereExtra },
      select: {
        id: true,
        slug: true,
        name: true,
        sku: true,
        priceCents: true,
        compareAtPriceCents: true,
        brand: { select: { name: true, slug: true } },
        images: {
          where: { isPrimary: true },
          select: { url: true, alt: true },
          take: 1,
        },
        variants: { select: { quantity: true, reserved: true } },
      },
      orderBy,
      take: sale ? 200 : 48,
    });

    products = rows.map((p) => {
      const img = p.images[0] ?? null;
      const available = p.variants.reduce(
        (sum, v) => sum + (v.quantity - v.reserved),
        0,
      );
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        sku: p.sku,
        priceCents: p.priceCents,
        compareAtPriceCents: p.compareAtPriceCents,
        primaryImageUrl: img?.url ?? null,
        primaryImageAlt: img?.alt ?? p.name,
        brandName: p.brand?.name ?? null,
        brandSlug: p.brand?.slug ?? null,
        inStock: available > 0,
      };
    });

    if (sale) {
      products = products
        .filter(
          (p) =>
            p.compareAtPriceCents !== null &&
            p.compareAtPriceCents > p.priceCents,
        )
        .slice(0, 48);
    }
  }

  return (
    <>
      {/* Breadcrumbs */}
      <nav aria-label="Хлебные крошки" className="border-b bg-gray-50">
        <div className="container mx-auto px-4 py-3 md:px-6">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
            <li>
              <Link
                href={"/" as Route}
                className="transition-colors hover:text-amber-600"
              >
                Главная
              </Link>
            </li>
            <li className="flex items-center gap-1">
              <span aria-hidden="true" className="text-gray-300">/</span>
              <span className="font-medium text-gray-800" aria-current="page">
                {title}
              </span>
            </li>
          </ol>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 md:px-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl">
          {title}
        </h1>

        {products.length > 0 ? (
          <ul
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            aria-label={title}
          >
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg font-medium text-gray-700">
              Товары не найдены
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Попробуйте перейти в каталог
            </p>
            <Link
              href={"/category" as Route}
              className="mt-4 inline-flex items-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
            >
              Перейти в каталог
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
