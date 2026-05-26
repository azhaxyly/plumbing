/**
 * Admin products list page — Server Component.
 *
 * Loads the product list via tRPC server caller and renders
 * the interactive ProductsListClient component.
 *
 * See task 25.3.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { ProductsListClient } from "@/components/admin/catalog/products-list";
import { createServerTrpc } from "@/lib/trpc-server";

export const metadata: Metadata = {
  title: "Товары — Timsan Admin",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    brandId?: string;
    categoryId?: string;
  }>;
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const search = params.search ?? "";
  const status = params.status as "active" | "draft" | "archived" | undefined;
  const brandId = params.brandId ?? undefined;
  const categoryId = params.categoryId ?? undefined;

  const trpc = await createServerTrpc();

  const [productsResult, brands, categories] = await Promise.all([
    trpc.adminProducts.list({
      page,
      limit: 20,
      ...(search ? { search } : {}),
      ...(status ? { status } : {}),
      ...(brandId ? { brandId } : {}),
      ...(categoryId ? { categoryId } : {}),
    }),
    trpc.adminBrands.list(),
    trpc.adminCategories.list(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Товары</h1>
          <p className="mt-1 text-sm text-gray-500">
            Управление каталогом товаров
          </p>
        </div>
        <Link
          href="/admin/catalog/products/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          + Добавить товар
        </Link>
      </div>

      <ProductsListClient
        initialData={productsResult}
        brands={brands}
        categories={categories}
        initialFilters={{ page, search, status, brandId, categoryId }}
      />
    </div>
  );
}
