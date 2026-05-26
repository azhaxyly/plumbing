/**
 * Admin attributes page — Server Component.
 * See task 25.4.
 */
import type { Metadata } from "next";

import { AttributesClient } from "@/components/admin/catalog/attributes-client";
import { createServerTrpc } from "@/lib/trpc-server";

export const metadata: Metadata = {
  title: "Атрибуты — Timsan Admin",
};

export default async function AdminAttributesPage() {
  const trpc = await createServerTrpc();
  const attributes = await trpc.adminAttributes.list();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Атрибуты</h1>
        <p className="mt-1 text-sm text-gray-500">
          Управление атрибутами товаров (цвет, размер, материал и т.д.)
        </p>
      </div>

      <AttributesClient initialAttributes={attributes} />
    </div>
  );
}
