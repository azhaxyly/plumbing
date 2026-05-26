"use client";

/**
 * OrdersFeed — real-time order feed for the admin dashboard.
 *
 * Polls /api/admin/orders/stream every 15 seconds.
 * Shows today's orders with quick-action buttons for new orders.
 *
 * See task 30.2.
 */

import { useCallback, useEffect, useState } from "react";
import type { Route } from "next";
import Link from "next/link";

import { OrderStatusBadge } from "@/components/admin/orders/order-status-badge";
import { transitionOrderStatus } from "@/app/(admin)/admin/orders/[id]/actions";
import type { OrderSummary } from "@/app/api/admin/orders/stream/route";

// Re-export type so the page can import it from one place
export type { OrderSummary };

// ─── Constants ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 15_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(Math.floor(cents / 100));
}

function relativeTime(date: Date | string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "только что";
  if (diffMin < 60) return `${diffMin} мин назад`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} ч назад`;
  return new Date(date).toLocaleString("ru-KZ", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ru-KZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(id: string): string {
  return id.slice(-8).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

interface OrdersFeedProps {
  initialOrders: OrderSummary[];
}

export function OrdersFeed({ initialOrders }: OrdersFeedProps) {
  const [orders, setOrders] = useState<OrderSummary[]>(initialOrders);
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/orders/stream", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { orders: OrderSummary[]; timestamp: string };
      setOrders(data.orders);
      setUpdatedAt(new Date(data.timestamp));
    } catch {
      // Silently ignore network errors — next poll will retry
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set up polling
  useEffect(() => {
    const id = setInterval(() => {
      void fetchOrders();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [fetchOrders]);

  // Quick action handler
  const handleAction = useCallback(
    async (orderId: string, newStatus: "confirmed" | "cancelled") => {
      setActionInProgress(orderId);
      try {
        const result = await transitionOrderStatus(orderId, newStatus);
        if (result.success) {
          await fetchOrders();
        }
      } finally {
        setActionInProgress(null);
      }
    },
    [fetchOrders],
  );

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="text-base font-medium text-gray-900">Заказы сегодня</h2>
        <div className="flex items-center gap-3">
          {isLoading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
              Обновление…
            </span>
          )}
          <span className="text-xs text-gray-400">
            Обновлено: {formatTime(updatedAt)}
          </span>
        </div>
      </div>

      {/* Feed */}
      {orders.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400">
          Заказов сегодня нет
        </div>
      ) : (
        <ul className="divide-y">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              actionInProgress={actionInProgress}
              onAction={handleAction}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── OrderCard ────────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: OrderSummary;
  actionInProgress: string | null;
  onAction: (orderId: string, newStatus: "confirmed" | "cancelled") => Promise<void>;
}

function OrderCard({ order, actionInProgress, onAction }: OrderCardProps) {
  const isDisabled = actionInProgress !== null;

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
      {/* Left: order info */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-gray-900">
            #{shortId(order.id)}
          </span>
          <OrderStatusBadge status={order.status} />
          <span className="text-xs text-gray-400">
            {relativeTime(order.createdAt)}
          </span>
        </div>

        <div className="text-sm text-gray-700">
          {order.contactName}
          <span className="mx-1 text-gray-300">·</span>
          <span className="text-gray-500">{order.contactPhone}</span>
        </div>

        <div className="text-sm font-medium text-gray-900">
          {formatMoney(order.subtotalCents)}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {order.status === "new" && (
          <>
            <button
              type="button"
              disabled={isDisabled}
              onClick={() => void onAction(order.id, "confirmed")}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Подтвердить
            </button>
            <button
              type="button"
              disabled={isDisabled}
              onClick={() => void onAction(order.id, "cancelled")}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Отменить
            </button>
          </>
        )}
        <Link
          href={`/admin/orders/${order.id}` as Route}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Открыть
        </Link>
      </div>
    </li>
  );
}
