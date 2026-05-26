import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@timsan/db";

import { auth } from "@/auth";

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

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Заказ #${id.slice(-8).toUpperCase()} — Timsan`,
  };
}

export default async function AccountOrderDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/account");
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    redirect("/login?callbackUrl=/account");
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  // 404 if order doesn't exist or belongs to another user
  if (!order || order.userId !== userId) {
    notFound();
  }

  const orderNumber = order.id.slice(-8).toUpperCase();
  const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;
  const statusColor = ORDER_STATUS_COLORS[order.status] ?? "bg-stone-100 text-stone-700";

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className="text-sm text-stone-500 transition-colors hover:text-stone-900"
          >
            ← Личный кабинет
          </Link>
          <span className="text-stone-300">/</span>
          <h1 className="text-xl font-bold text-stone-900 md:text-2xl">
            Заказ{" "}
            <span className="font-mono">#{orderNumber}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500">{formatDate(order.createdAt)}</span>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: order items */}
        <div className="lg:col-span-2">
          <section className="rounded-xl border border-stone-200 bg-white">
            <div className="border-b border-stone-100 px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                Состав заказа
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                    <th className="px-6 py-3">Товар</th>
                    <th className="px-4 py-3 text-right">Цена</th>
                    <th className="px-4 py-3 text-right">Кол-во</th>
                    <th className="px-4 py-3 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {item.imageUrlSnapshot && (
                            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-stone-100 bg-stone-50">
                              <Image
                                src={item.imageUrlSnapshot}
                                alt={item.nameSnapshot}
                                fill
                                className="object-contain"
                                sizes="56px"
                              />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-stone-900">
                              {item.nameSnapshot}
                            </div>
                            <div className="mt-0.5 text-xs text-stone-500">
                              Арт. {item.skuSnapshot}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-stone-700 whitespace-nowrap">
                        {formatMoney(item.unitPriceCents)}
                      </td>
                      <td className="px-4 py-4 text-right text-stone-700">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-stone-900 whitespace-nowrap">
                        {formatMoney(item.unitPriceCents * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-stone-200 bg-stone-50">
                    <td
                      colSpan={3}
                      className="px-6 py-4 text-right text-sm font-semibold text-stone-700"
                    >
                      Итого
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-bold text-stone-900 whitespace-nowrap">
                      {formatMoney(order.subtotalCents)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>

        {/* Right: contacts + address */}
        <div className="space-y-6">
          {/* Contact info */}
          <section className="rounded-xl border border-stone-200 bg-white">
            <div className="border-b border-stone-100 px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                Контактные данные
              </h2>
            </div>
            <dl className="space-y-3 px-6 py-4 text-sm">
              <div>
                <dt className="text-stone-500">Имя</dt>
                <dd className="mt-0.5 font-medium text-stone-900">{order.contactName}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Телефон</dt>
                <dd className="mt-0.5 font-medium text-stone-900">
                  <a href={`tel:${order.contactPhone}`} className="hover:text-emerald-700">
                    {order.contactPhone}
                  </a>
                </dd>
              </div>
            </dl>
          </section>

          {/* Delivery address */}
          <section className="rounded-xl border border-stone-200 bg-white">
            <div className="border-b border-stone-100 px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                Адрес доставки
              </h2>
            </div>
            <dl className="space-y-3 px-6 py-4 text-sm">
              <div>
                <dt className="text-stone-500">Город</dt>
                <dd className="mt-0.5 font-medium text-stone-900">{order.addressCity}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Улица</dt>
                <dd className="mt-0.5 font-medium text-stone-900">{order.addressStreet}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Дом</dt>
                <dd className="mt-0.5 font-medium text-stone-900">{order.addressBuilding}</dd>
              </div>
              {order.addressApartment && (
                <div>
                  <dt className="text-stone-500">Квартира</dt>
                  <dd className="mt-0.5 font-medium text-stone-900">{order.addressApartment}</dd>
                </div>
              )}
              {order.comment && (
                <div>
                  <dt className="text-stone-500">Комментарий</dt>
                  <dd className="mt-0.5 text-stone-700">{order.comment}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
