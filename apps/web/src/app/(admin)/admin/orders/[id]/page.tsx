/**
 * Admin order detail page — Server Component.
 *
 * Displays full order information: items, client contacts, delivery address,
 * status history (AuditLog), and action buttons for status transitions.
 *
 * See tasks 26.2 and 26.3.
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@timsan/db";

import { OrderStatusBadge } from "@/components/admin/orders/order-status-badge";
import { OrderActions } from "@/components/admin/orders/order-actions";
import type { OrderStatus } from "@/components/admin/orders/order-status-badge";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(Math.floor(cents / 100));
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString("ru-KZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const orderNumber = id.slice(-8).toUpperCase();
  return {
    title: `Заказ #${orderNumber} — Timsan Admin`,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch order with items in parallel with audit log
  const [order, auditEntries] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: { entity: "Order", entityId: id },
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: { email: true, id: true },
        },
      },
    }),
  ]);

  if (!order) {
    notFound();
  }

  const orderNumber = order.id.slice(-8).toUpperCase();
  const currentStatus = order.status as OrderStatus;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Заказы
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-semibold text-gray-900">
            Заказ{" "}
            <span className="font-mono text-xl">#{orderNumber}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{formatDate(order.createdAt)}</span>
          <OrderStatusBadge status={currentStatus} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left column: items + history ──────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Позиции заказа */}
          <section className="rounded-lg border bg-white shadow-sm">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Позиции заказа
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Товар</th>
                    <th className="px-4 py-3 text-right">Цена</th>
                    <th className="px-4 py-3 text-right">Кол-во</th>
                    <th className="px-4 py-3 text-right">Итого</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.imageUrlSnapshot && (
                            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border bg-gray-50">
                              <Image
                                src={item.imageUrlSnapshot}
                                alt={item.nameSnapshot}
                                fill
                                className="object-contain"
                                sizes="48px"
                              />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">
                              {item.nameSnapshot}
                            </div>
                            <div className="mt-0.5 text-xs text-gray-500">
                              {item.skuSnapshot}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                        {formatMoney(item.unitPriceCents)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                        {formatMoney(item.unitPriceCents * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-gray-50">
                    <td
                      colSpan={3}
                      className="px-4 py-3 text-right text-sm font-semibold text-gray-700"
                    >
                      Итого
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 whitespace-nowrap">
                      {formatMoney(order.subtotalCents)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* История изменений */}
          <section className="rounded-lg border bg-white shadow-sm">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                История изменений
              </h2>
            </div>
            <div className="px-4 py-4">
              {auditEntries.length === 0 ? (
                <p className="text-sm text-gray-500">История изменений пуста.</p>
              ) : (
                <ol className="relative border-l border-gray-200">
                  {auditEntries.map((entry) => {
                    const before =
                      entry.before &&
                      typeof entry.before === "object" &&
                      "status" in entry.before
                        ? String((entry.before as { status: unknown }).status)
                        : null;
                    const after =
                      entry.after &&
                      typeof entry.after === "object" &&
                      "status" in entry.after
                        ? String((entry.after as { status: unknown }).status)
                        : null;

                    return (
                      <li key={entry.id} className="mb-6 ml-4 last:mb-0">
                        <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-300" />
                        <time className="mb-1 block text-xs font-normal leading-none text-gray-400">
                          {formatDate(entry.createdAt)}
                        </time>
                        <p className="text-sm font-medium text-gray-900">
                          {entry.action === "status_change" && before && after ? (
                            <>
                              Статус изменён:{" "}
                              <OrderStatusBadge
                                status={before as OrderStatus}
                                className="mr-1"
                              />
                              →{" "}
                              <OrderStatusBadge
                                status={after as OrderStatus}
                                className="ml-1"
                              />
                            </>
                          ) : (
                            entry.action
                          )}
                        </p>
                        {entry.actor && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            {entry.actor.email}
                          </p>
                        )}
                        {!entry.actor && entry.actorUserId && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            Пользователь {entry.actorUserId}
                          </p>
                        )}
                        {!entry.actorUserId && (
                          <p className="mt-0.5 text-xs text-gray-500">Система</p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </section>
        </div>

        {/* ── Right column: contacts, address, actions ──────────────────────── */}
        <div className="space-y-6">
          {/* Контакты клиента */}
          <section className="rounded-lg border bg-white shadow-sm">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Контакты клиента
              </h2>
            </div>
            <div className="px-4 py-4 space-y-2">
              <div>
                <span className="text-xs text-gray-500">Имя</span>
                <p className="text-sm font-medium text-gray-900">
                  {order.contactName}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Телефон</span>
                <p className="text-sm font-medium text-gray-900">
                  <a
                    href={`tel:${order.contactPhone}`}
                    className="hover:text-blue-600"
                  >
                    {order.contactPhone}
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* Адрес доставки */}
          <section className="rounded-lg border bg-white shadow-sm">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Адрес доставки
              </h2>
            </div>
            <div className="px-4 py-4 space-y-2">
              <div>
                <span className="text-xs text-gray-500">Город</span>
                <p className="text-sm font-medium text-gray-900">
                  {order.addressCity}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Улица</span>
                <p className="text-sm font-medium text-gray-900">
                  {order.addressStreet}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Дом</span>
                <p className="text-sm font-medium text-gray-900">
                  {order.addressBuilding}
                </p>
              </div>
              {order.addressApartment && (
                <div>
                  <span className="text-xs text-gray-500">Квартира</span>
                  <p className="text-sm font-medium text-gray-900">
                    {order.addressApartment}
                  </p>
                </div>
              )}
              {order.comment && (
                <div>
                  <span className="text-xs text-gray-500">Комментарий</span>
                  <p className="text-sm text-gray-700">{order.comment}</p>
                </div>
              )}
            </div>
          </section>

          {/* Действия */}
          <OrderActions orderId={order.id} currentStatus={currentStatus} />
        </div>
      </div>
    </div>
  );
}
