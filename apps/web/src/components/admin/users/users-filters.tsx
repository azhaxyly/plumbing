"use client";

/**
 * UsersFilters — Client Component for the users filter bar.
 * Updates URL search params on submit/reset.
 * See task 27.
 */
import { Button } from "@timsan/ui";
import { Loader2 } from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";


interface UsersFiltersProps {
  currentRole: string;
  currentStatus: string;
}

export function UsersFilters({ currentRole, currentStatus }: UsersFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    // Always reset to page 1 when filters change
    params.delete("page");

    const merged = {
      role: currentRole,
      status: currentStatus,
      ...overrides,
    };

    if (merged.role && merged.role !== "all") {
      params.set("role", merged.role);
    } else {
      params.delete("role");
    }

    if (merged.status && merged.status !== "all") {
      params.set("status", merged.status);
    } else {
      params.delete("status");
    }

    return `/admin/users?${params.toString()}`;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    startTransition(() => {
      router.push(
        buildUrl({
          role: (data.get("role") as string) ?? "all",
          status: (data.get("status") as string) ?? "all",
        }) as Route,
      );
    });
  }

  function handleReset() {
    startTransition(() => {
      router.push("/admin/users" as Route);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border bg-white p-4 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Role filter */}
        <div>
          <label
            htmlFor="users-role"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Роль
          </label>
          <select
            id="users-role"
            name="role"
            defaultValue={currentRole || "all"}
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="all">Все роли</option>
            <option value="customer">Покупатель</option>
            <option value="manager">Менеджер</option>
            <option value="admin">Администратор</option>
          </select>
        </div>

        {/* Status filter */}
        <div>
          <label
            htmlFor="users-status"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Статус
          </label>
          <select
            id="users-status"
            name="status"
            defaultValue={currentStatus || "all"}
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="all">Все</option>
            <option value="active">Активные</option>
            <option value="blocked">Заблокированные</option>
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
