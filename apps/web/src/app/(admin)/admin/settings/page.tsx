/**
 * Admin settings page — Server Component.
 *
 * Fetches all relevant settings from the DB in one query and renders
 * two sections: "Контакты магазина" and "Уведомления".
 *
 * See tasks 28.1 and 28.2.
 */
import { prisma } from "@timsan/db";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { NotificationsForm } from "@/components/admin/settings/notifications-form";
import { SearchReindexButton } from "@/components/admin/settings/search-reindex-button";

export const metadata: Metadata = {
  title: "Настройки — Timsan Admin",
};

const NOTIFICATION_KEYS = ["owner_emails", "telegram_bot_token", "telegram_chat_ids"] as const;

const ALL_KEYS = [...NOTIFICATION_KEYS];

export default async function AdminSettingsPage() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ALL_KEYS } },
    select: { key: true, value: true },
  });

  const settingsMap: Record<string, string> = {};
  for (const row of rows) {
    settingsMap[row.key] = row.value;
  }

  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  const isAdmin = user?.role === "admin";

  const notificationsInitial = {
    owner_emails: settingsMap["owner_emails"] ?? "[]",
    telegram_bot_token: settingsMap["telegram_bot_token"] ?? "",
    telegram_chat_ids: settingsMap["telegram_chat_ids"] ?? "[]",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Настройки</h1>
        <p className="mt-1 text-sm text-gray-500">Управление настройками уведомлений</p>
      </div>

      {/* Поиск */}
      {isAdmin && (
        <section
          aria-labelledby="search-heading"
          className="rounded-lg border bg-white p-6 shadow-sm"
        >
          <div className="mb-4">
            <h2 id="search-heading" className="text-lg font-semibold text-gray-900">
              Поиск
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Переиндексирует все активные товары в Meilisearch. Запускайте если товары не находятся
              в поиске.
            </p>
          </div>
          <SearchReindexButton />
        </section>
      )}

      {/* Уведомления */}
      {isAdmin ? (
        <section
          aria-labelledby="notifications-heading"
          className="rounded-lg border bg-white p-6 shadow-sm"
        >
          <div className="mb-6">
            <h2 id="notifications-heading" className="text-lg font-semibold text-gray-900">
              Уведомления
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Email-адреса и Telegram-бот для получения уведомлений о новых заказах. Доступно только
              администратору.
            </p>
          </div>
          <NotificationsForm initialValues={notificationsInitial} />
        </section>
      ) : (
        <section
          aria-labelledby="notifications-heading"
          className="rounded-lg border bg-white p-6 opacity-60 shadow-sm"
        >
          <div className="mb-2">
            <h2 id="notifications-heading" className="text-lg font-semibold text-gray-900">
              Уведомления
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            Настройки уведомлений доступны только администратору.
          </p>
        </section>
      )}
    </div>
  );
}
