/**
 * Admin brands page — Server Component.
 *
 * Loads the brand list via tRPC server caller and renders
 * the interactive BrandsClient component.
 *
 * See task 25.2.
 */
import type { Metadata } from "next";

import { BrandsClient } from "@/components/admin/catalog/brands-client";
import { createServerTrpc } from "@/lib/trpc-server";

export const metadata: Metadata = {
  title: "Бренды — Timsan Admin",
};

export default async function AdminBrandsPage() {
  const trpc = await createServerTrpc();
  const brands = await trpc.adminBrands.list();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Бренды</h1>
          <p className="mt-1 text-sm text-gray-500">
            Управление брендами каталога
          </p>
        </div>
      </div>

      <BrandsClient initialBrands={brands} />
    </div>
  );
}
