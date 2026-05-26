/**
 * Admin banners page — Server Component.
 * See task 25.6.
 */
import type { Metadata } from "next";

import { BannersClient } from "@/components/admin/content/banners-client";
import { createServerTrpc } from "@/lib/trpc-server";

export const metadata: Metadata = {
  title: "Баннеры — Timsan Admin",
};

export default async function AdminBannersPage() {
  const trpc = await createServerTrpc();
  const banners = await trpc.adminBanners.list();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Баннеры главной</h1>
        <p className="mt-1 text-sm text-gray-500">
          Управление слайдером и баннерами на главной странице
        </p>
      </div>

      <BannersClient initialBanners={banners} />
    </div>
  );
}
