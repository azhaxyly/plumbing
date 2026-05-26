/**
 * Admin product create page — Server Component.
 *
 * Loads brands, categories, and attributes for the form selects,
 * then renders the ProductForm in "create" mode.
 *
 * See task 25.3.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { ProductForm } from "@/components/admin/catalog/product-form";
import { createServerTrpc } from "@/lib/trpc-server";

export const metadata: Metadata = {
  title: "Новый товар — Timsan Admin",
};

export default async function AdminProductNewPage() {
  const trpc = await createServerTrpc();

  const [brands, categories, attributes] = await Promise.all([
    trpc.adminBrands.list(),
    trpc.adminCategories.list(),
    trpc.adminProducts.listAttributes(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/catalog/products"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Товары
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-semibold text-gray-900">Новый товар</h1>
      </div>

      <ProductForm
        mode="create"
        brands={brands}
        categories={categories}
        attributes={attributes}
      />
    </div>
  );
}
