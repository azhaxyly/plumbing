"use client";

/**
 * OrdersFilters — Client Component for the orders filter bar.
 * Updates URL search params on change/submit.
 * See task 26.1.
 */
import { Loader2 } from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@timsan/ui";

export type OrderSortOption =
  | "createdAt_desc"
  | "createdAt_asc"
  | "subtotal_desc"
  | "subtotal_asc";

interface OrdersFiltersProps {
  currentStatus: string;
  currentFrom: string;
  currentTo: string;
  currentSort: OrderSortOption;
}

export function OrdersFilters({
  currentStatus,
  currentFrom,
  currentTo,
  currentSort,
}: OrdersFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    // Always reset to page 1 when filters change
    params.delete("page");

    const merged = {
      status: currentStatus,
      from: currentFrom,
      to: currentTo,
      sort: currentSort,
      ...overrides,
    };

    if (merged.status && merged.status !== "all") {
      params.set("status", merged.status);
    } else {
      params.delete("status");
    }

    if (merged.from) {
      params.set("from", merged.from);
    } else {
      params.delete("from");
    }

    if (merged.to) {
      params.set("to", merged.to);
    } else {
      params.delete("to");
    }

    if (merged.sort && merged.sort !== "createdAt_desc") {
      params.set("sort", merged.sort);
    } else {
      params.delete("sort");
    }

    return `/admin/orders?${params.toString()}`;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    startTransition(() => {
      router.push(
        buildUrl({
          status: (data.get("status") as string) ?? "",
          from: (data.get("from") as string) ?? "",
          to: (data.get("to") as string) ?? "",
          sort: (data.get("sort") as string) ?? "createdAt_desc",
        }) as Route,
      );
    });
  }

  function handleReset() {
    startTransition(() => {
      router.push("/admin/orders" as Route);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border bg-white p-4 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Status */}
        <div>
          <label
            htmlFor="orders-status"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Статус
          </label>
          <select
            id="orders-status"
            name="status"
            defaultValue={currentStatus || "all"}
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="all">Все статусы</option>
            <option value="new">Новый</option>
            <option value="confirmed">Подтверждён</option>
            <option value="delivered">Доставлен</option>
            <option value="cancelled">Отменён</option>
          </select>
        </div>

        {/* Date from */}
        <div>
          <label
            htmlFor="orders-from"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Дата с
          </label>
          <input
            id="orders-from"
            name="from"
            type="date"
            defaultValue={currentFrom}
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Date to */}
        <div>
          <label
            htmlFor="orders-to"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Дата по
          </label>
          <input
            id="orders-to"
            name="to"
            type="date"
            defaultValue={currentTo}
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Sort */}
        <div>
          <label
            htmlFor="orders-sort"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Сортировка
          </label>
          <select
            id="orders-sort"
            name="sort"
            defaultValue={currentSort}
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="createdAt_desc">Дата ↓ (новые)</option>
            <option value="createdAt_asc">Дата ↑ (старые)</option>
            <option value="subtotal_desc">Сумма ↓</option>
            <option value="subtotal_asc">Сумма ↑</option>
          </select>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          )}
          Применить
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleReset}
          disabled={isPending}
        >
          Сбросить
        </Button>
      </div>
    </form>
  );
}
