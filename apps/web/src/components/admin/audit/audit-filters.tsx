"use client";

/**
 * AuditFilters — Client Component for the audit log filter bar.
 * Updates URL search params on submit/reset.
 * See task 29.3.
 */
import { Button } from "@timsan/ui";
import { Loader2 } from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";


// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditEntityFilter =
  | "Product"
  | "Order"
  | "User"
  | "Category"
  | "Brand"
  | "Attribute"
  | "Setting"
  | "Page"
  | "Banner"
  | "Coupon"
  | "all";

export type AuditActionFilter =
  | "create"
  | "update"
  | "delete"
  | "status_change"
  | "role_change"
  | "block"
  | "unblock"
  | "all";

interface AuditFiltersProps {
  currentEntity: string;
  currentAction: string;
  currentFrom: string;
  currentTo: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuditFilters({
  currentEntity,
  currentAction,
  currentFrom,
  currentTo,
}: AuditFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    // Always reset to page 1 when filters change
    params.delete("page");

    const merged = {
      entity: currentEntity,
      action: currentAction,
      from: currentFrom,
      to: currentTo,
      ...overrides,
    };

    if (merged.entity && merged.entity !== "all") {
      params.set("entity", merged.entity);
    } else {
      params.delete("entity");
    }

    if (merged.action && merged.action !== "all") {
      params.set("action", merged.action);
    } else {
      params.delete("action");
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

    const qs = params.toString();
    return `/admin/audit${qs ? `?${qs}` : ""}`;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    startTransition(() => {
      router.push(
        buildUrl({
          entity: (data.get("entity") as string) ?? "all",
          action: (data.get("action") as string) ?? "all",
          from: (data.get("from") as string) ?? "",
          to: (data.get("to") as string) ?? "",
        }) as Route,
      );
    });
  }

  function handleReset() {
    startTransition(() => {
      router.push("/admin/audit" as Route);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border bg-white p-4 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Entity */}
        <div>
          <label
            htmlFor="audit-entity"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Сущность
          </label>
          <select
            id="audit-entity"
            name="entity"
            defaultValue={currentEntity || "all"}
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="all">Все сущности</option>
            <option value="Product">Товар</option>
            <option value="Order">Заказ</option>
            <option value="User">Пользователь</option>
            <option value="Category">Категория</option>
            <option value="Brand">Бренд</option>
            <option value="Attribute">Атрибут</option>
            <option value="Setting">Настройка</option>
            <option value="Page">Страница</option>
            <option value="Banner">Баннер</option>
            <option value="Coupon">Купон</option>
          </select>
        </div>

        {/* Action */}
        <div>
          <label
            htmlFor="audit-action"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Действие
          </label>
          <select
            id="audit-action"
            name="action"
            defaultValue={currentAction || "all"}
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="all">Все действия</option>
            <option value="create">Создание</option>
            <option value="update">Обновление</option>
            <option value="delete">Удаление</option>
            <option value="status_change">Смена статуса</option>
            <option value="role_change">Смена роли</option>
            <option value="block">Блокировка</option>
            <option value="unblock">Разблокировка</option>
          </select>
        </div>

        {/* Date from */}
        <div>
          <label
            htmlFor="audit-from"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Дата с
          </label>
          <input
            id="audit-from"
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
            htmlFor="audit-to"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Дата по
          </label>
          <input
            id="audit-to"
            name="to"
            type="date"
            defaultValue={currentTo}
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
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
