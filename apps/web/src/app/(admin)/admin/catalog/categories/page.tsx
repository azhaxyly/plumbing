/**
 * Admin categories page — Server Component.
 *
 * Loads the category tree via tRPC server caller and renders
 * the interactive CategoryTreeClient component.
 *
 * See task 25.1.
 */
import type { Metadata } from "next";

import { CategoryTreeClient } from "@/components/admin/catalog/category-tree";
import { createServerTrpc } from "@/lib/trpc-server";

export const metadata: Metadata = {
  title: "Категории — Timsan Admin",
};

export default async function AdminCategoriesPage() {
  const trpc = await createServerTrpc();
  const categories = await trpc.adminCategories.list();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Категории</h1>
          <p className="mt-1 text-sm text-gray-500">
            Управление деревом категорий каталога
          </p>
        </div>
      </div>

      <CategoryTreeClient initialCategories={categories} />
    </div>
  );
}
