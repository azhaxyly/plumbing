import { prisma } from "@timsan/db";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { CART_GUEST_COOKIE } from "@/lib/cart-redis";

export const metadata: Metadata = {
  title: "Мои заказы",
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
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(Math.floor(cents / 100));
}

function formatDate(date: Date): string {
  return date.toLocaleString("ru-KZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OrdersPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  const cookieStore = await cookies();
  const guestId = cookieStore.get(CART_GUEST_COOKIE)?.value ?? null;

  const orders =
    !userId && !guestId
      ? []
      : await prisma.order.findMany({
          where: userId ? { userId } : { guestId: guestId ?? "" },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            contactName: true,
            subtotalCents: true,
            createdAt: true,
            _count: { select: { items: true } },
          },
        });

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Мои заказы</h1>
        {userId && (
          <Link
            href="/account"
            className="text-sm text-stone-500 transition-colors hover:text-stone-900"
          >
            ← Личный кабинет
          </Link>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="mb-4 text-lg text-stone-500">У вас ещё нет заказов</p>
          <Link
            href="/catalog"
            className="rounded-lg bg-stone-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
          >
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const orderNumber = order.id.slice(-8).toUpperCase();
            const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;
            const statusColor = ORDER_STATUS_COLORS[order.status] ?? "bg-stone-100 text-stone-700";

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block rounded-xl border border-stone-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="font-mono text-sm font-semibold text-stone-900">
                        #{orderNumber}
                      </span>
                      <p className="mt-0.5 text-xs text-stone-500">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-stone-600">
                      {order._count.items}{" "}
                      {order._count.items === 1
                        ? "товар"
                        : order._count.items < 5
                          ? "товара"
                          : "товаров"}
                    </span>
                    <span className="font-semibold text-stone-900">
                      {formatMoney(order.subtotalCents)}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusColor}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
