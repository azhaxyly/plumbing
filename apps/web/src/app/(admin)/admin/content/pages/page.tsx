/**
 * Admin CMS pages list — Server Component.
 * See task 25.5.
 */
import type { Metadata } from "next";

import { PagesClient } from "@/components/admin/content/pages-client";
import { createServerTrpc } from "@/lib/trpc-server";

export const metadata: Metadata = {
  title: "Страницы (CMS) — Timsan Admin",
};

export default async function AdminPagesPage() {
  const trpc = await createServerTrpc();
  const pages = await trpc.adminPages.list();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Страницы</h1>
        <p className="mt-1 text-sm text-gray-500">
          CMS-страницы сайта: О нас, Доставка, Контакты и т.д.
        </p>
      </div>

      <PagesClient initialPages={pages} />
    </div>
  );
}
