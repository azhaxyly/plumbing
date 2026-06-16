import { prisma } from "@timsan/db";
import { Button } from "@timsan/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ChangePasswordForm } from "./change-password-form";

import { auth } from "@/auth";
import { logoutAction } from "@/lib/auth-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Личный кабинет",
  robots: { index: false, follow: true },
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  delivered: "bg-stone-100 text-stone-700",
  cancelled: "bg-red-100 text-red-700",
};

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("ru-KZ") + " ₸";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-KZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/account");
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    redirect("/login?callbackUrl=/account");
  }

  const [user, orders] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        phone: true,
        createdAt: true,
      },
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        subtotalCents: true,
        contactName: true,
        createdAt: true,
        items: {
          select: { quantity: true },
        },
      },
    }),
  ]);

  if (!user) {
    redirect("/login?callbackUrl=/account");
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <h1 className="mb-8 text-2xl font-bold text-stone-900 md:text-3xl">Личный кабинет</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left column: profile + logout */}
        <div className="space-y-8 lg:col-span-1">
          {/* Profile */}
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-stone-900">Профиль</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-stone-500">Email</dt>
                <dd className="mt-0.5 font-medium text-stone-900">{user.email}</dd>
              </div>
              {user.phone && (
                <div>
                  <dt className="text-stone-500">Телефон</dt>
                  <dd className="mt-0.5 font-medium text-stone-900">{user.phone}</dd>
                </div>
              )}
              <div>
                <dt className="text-stone-500">Зарегистрирован</dt>
                <dd className="mt-0.5 font-medium text-stone-900">{formatDate(user.createdAt)}</dd>
              </div>
            </dl>
          </section>

          {/* Change password */}
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-stone-900">Смена пароля</h2>
            <ChangePasswordForm />
          </section>

          {/* Logout */}
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-stone-900">Выход из аккаунта</h2>
            <form action={logoutAction}>
              <Button type="submit" variant="destructive" className="w-full">
                Выйти
              </Button>
            </form>
          </section>
        </div>

        {/* Right column: orders */}
        <div className="lg:col-span-2">
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-stone-900">
              Мои заказы
              {orders.length > 0 && (
                <span className="ml-2 text-sm font-normal text-stone-500">({orders.length})</span>
              )}
            </h2>

            {orders.length === 0 ? (
              <p className="text-sm text-stone-500">У вас пока нет заказов.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 text-left text-stone-500">
                      <th className="pb-3 pr-4 font-medium">Заказ</th>
                      <th className="pb-3 pr-4 font-medium">Дата</th>
                      <th className="hidden pb-3 pr-4 font-medium sm:table-cell">Товаров</th>
                      <th className="pb-3 pr-4 font-medium">Сумма</th>
                      <th className="pb-3 font-medium">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {orders.map((order) => {
                      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
                      const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;
                      const statusColor =
                        ORDER_STATUS_COLORS[order.status] ?? "bg-stone-100 text-stone-700";

                      return (
                        <tr key={order.id} className="transition-colors hover:bg-stone-50">
                          <td className="py-3 pr-4">
                            <Link
                              href={`/account/orders/${order.id}`}
                              className="font-mono text-xs text-emerald-700 hover:underline"
                            >
                              #{order.id.slice(-8).toUpperCase()}
                            </Link>
                          </td>
                          <td className="py-3 pr-4 text-stone-600">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="hidden py-3 pr-4 text-stone-600 sm:table-cell">
                            {itemCount}
                          </td>
                          <td className="py-3 pr-4 font-medium text-stone-900">
                            {formatPrice(order.subtotalCents)}
                          </td>
                          <td className="py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
