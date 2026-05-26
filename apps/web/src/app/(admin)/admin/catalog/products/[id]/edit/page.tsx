/**
 * Admin product edit page — Server Component.
 *
 * Loads the product with all relations, brands, categories, and attributes,
 * then renders the ProductForm in "edit" mode.
 *
 * See task 25.3.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/admin/catalog/product-form";
import { createServerTrpc } from "@/lib/trpc-server";

export const metadata: Metadata = {
  title: "Редактировать товар — Timsan Admin",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminProductEditPage({ params }: PageProps) {
  const { id } = await params;
  const trpc = await createServerTrpc();

  const [product, brands, categories, attributes] = await Promise.all([
    trpc.adminProducts.getById({ id }).catch(() => null),
    trpc.adminBrands.list(),
    trpc.adminCategories.list(),
    trpc.adminProducts.listAttributes(),
  ]);

  if (!product) {
    notFound();
  }

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
        <h1 className="text-2xl font-semibold text-gray-900 line-clamp-1">
          {product.name}
        </h1>
      </div>

      <ProductForm
        mode="edit"
        product={product}
        brands={brands}
        categories={categories}
        attributes={attributes}
      />
    </div>
  );
}
