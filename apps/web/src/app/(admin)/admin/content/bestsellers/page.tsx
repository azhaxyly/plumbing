import type { Metadata } from "next";

import { BestsellersClient } from "@/components/admin/content/bestsellers-client";
import { createServerTrpc } from "@/lib/trpc-server";

export const metadata: Metadata = {
  title: "Хиты продаж — Timsan Admin",
};

export default async function AdminBestsellersPage() {
  const trpc = await createServerTrpc();
  const items = await trpc.adminBestsellers.list();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Хиты продаж</h1>
        <p className="mt-1 text-sm text-gray-500">
          Управление списком товаров в разделе "Хиты продаж" на главной странице
        </p>
      </div>

      <BestsellersClient initialItems={items} />
    </div>
  );
}
