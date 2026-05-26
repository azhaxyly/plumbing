"use client";

/**
 * OrderActions — Client Component for manual order status transitions.
 *
 * Renders action buttons based on the current order status and the
 * ALLOWED_TRANSITIONS state machine. On click, calls the Server Action
 * and refreshes the page data via router.refresh().
 *
 * See task 26.3.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ALLOWED_TRANSITIONS } from "@timsan/domain";

import { transitionOrderStatus } from "@/app/(admin)/admin/orders/[id]/actions";

import type { OrderStatus } from "./order-status-badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderActionsProps {
  orderId: string;
  currentStatus: OrderStatus;
}

// ─── Button config ────────────────────────────────────────────────────────────

const TRANSITION_LABELS: Record<OrderStatus, string> = {
  new: "Новый",
  confirmed: "Подтвердить",
  delivered: "Доставлен",
  cancelled: "Отменить",
};

function getButtonStyle(status: OrderStatus): string {
  if (status === "cancelled") {
    return "inline-flex items-center rounded-md px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
  }
  if (status === "confirmed" || status === "delivered") {
    return "inline-flex items-center rounded-md px-4 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
  }
  return "inline-flex items-center rounded-md px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrderActions({ orderId, currentStatus }: OrderActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] as OrderStatus[];

  // Final states — no actions available
  if (allowedNext.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Действия
        </h2>
        <p className="text-sm text-gray-500">Финальный статус — действия недоступны.</p>
      </div>
    );
  }

  async function handleTransition(newStatus: OrderStatus) {
    setLoading(newStatus);
    setError(null);

    try {
      const result = await transitionOrderStatus(orderId, newStatus);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Неизвестная ошибка");
      }
    } catch {
      setError("Ошибка при выполнении действия");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Действия
      </h2>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {allowedNext.map((nextStatus) => (
          <button
            key={nextStatus}
            onClick={() => handleTransition(nextStatus)}
            disabled={loading !== null}
            className={getButtonStyle(nextStatus)}
          >
            {loading === nextStatus ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Выполняется…
              </span>
            ) : (
              TRANSITION_LABELS[nextStatus]
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
