/**
 * OrdersTable — Server Component for the orders list table.
 * Renders the table rows and pagination controls.
 * See task 26.1.
 */
import { Eye } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { OrderStatusBadge } from "./order-status-badge";
import type { OrderStatus } from "./order-status-badge";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderRow {
  id: string;
  status: OrderStatus;
  contactName: string;
  contactPhone: string;
  addressStreet: string;
  addressBuilding: string;
  addressApartment: string | null;
  addressCity: string;
  subtotalCents: number;
  createdAt: Date;
}

export interface PaginatedOrders {
  items: OrderRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface OrdersTableProps {
  data: PaginatedOrders;
  /** Base URL for pagination links (without page param) */
  baseUrl: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(Math.floor(cents / 100));
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("ru-KZ", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildPageUrl(baseUrl: string, page: number): string {
  const url = new URL(baseUrl, "http://localhost");
  if (page > 1) {
    url.searchParams.set("page", String(page));
  } else {
    url.searchParams.delete("page");
  }
  return `${url.pathname}${url.search}`;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  total,
  baseUrl,
}: {
  page: number;
  totalPages: number;
  total: number;
  baseUrl: string;
}) {
  if (totalPages <= 1) return null;

  // Show up to 5 page numbers centered around current page
  const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pageNumbers = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => startPage + i,
  ).filter((p) => p <= totalPages);

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-500">
        Страница {page} из {totalPages} ({total} заказов)
      </p>
      <div className="flex items-center gap-1">
        {/* Prev */}
        {page > 1 ? (
          <Link
            href={buildPageUrl(baseUrl, page - 1) as Route}
            className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            ← Назад
          </Link>
        ) : (
          <span className="inline-flex h-8 cursor-not-allowed items-center rounded-md border border-input bg-background px-3 text-sm font-medium opacity-50">
            ← Назад
          </span>
        )}

        {/* Page numbers */}
        {pageNumbers.map((p) =>
          p === page ? (
            <span
              key={p}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={buildPageUrl(baseUrl, p) as Route}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              {p}
            </Link>
          ),
        )}

        {/* Next */}
        {page < totalPages ? (
          <Link
            href={buildPageUrl(baseUrl, page + 1) as Route}
            className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Вперёд →
          </Link>
        ) : (
          <span className="inline-flex h-8 cursor-not-allowed items-center rounded-md border border-input bg-background px-3 text-sm font-medium opacity-50">
            Вперёд →
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OrdersTable({ data, baseUrl }: OrdersTableProps) {
  return (
    <div className="space-y-4">
      {/* Count */}
      <p className="text-sm text-gray-500">Найдено: {data.total}</p>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        {data.items.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            Заказов не найдено.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">№</th>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3">Клиент</th>
                  <th className="px-4 py-3">Адрес</th>
                  <th className="px-4 py-3 text-right">Сумма</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((order) => {
                  const address = [
                    order.addressCity,
                    order.addressStreet,
                    order.addressBuilding,
                    order.addressApartment
                      ? `кв. ${order.addressApartment}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <tr key={order.id} className="group hover:bg-gray-50">
                      {/* № */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-500">
                          {order.id.slice(-8).toUpperCase()}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {order.contactName}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500">
                          {order.contactPhone}
                        </div>
                      </td>

                      {/* Address */}
                      <td className="px-4 py-3 text-gray-600 max-w-[200px]">
                        <span className="line-clamp-2 text-xs">{address}</span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                        {formatMoney(order.subtotalCents)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/orders/${order.id}` as Route}
                            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                            aria-label={`Открыть заказ ${order.id}`}
                            title="Открыть заказ"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Открыть</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
        baseUrl={baseUrl}
      />
    </div>
  );
}
