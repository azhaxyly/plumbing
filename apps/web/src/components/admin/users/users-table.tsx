/**
 * UsersTable — Server Component for the users list table.
 * Renders the table rows, role/status badges, action buttons, and pagination.
 * See task 27.
 */
import { cn } from "@timsan/ui";
import type { Route } from "next";
import Link from "next/link";


import { UserBlockButton } from "./user-block-button";
import { UserRoleSelect } from "./user-role-select";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "customer" | "manager" | "admin";

export interface UserRow {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  blockedAt: Date | null;
  createdAt: Date;
}

export interface PaginatedUsers {
  items: UserRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UsersTableProps {
  data: PaginatedUsers;
  /** Base URL for pagination links (without page param) */
  baseUrl: string;
  /** ID of the currently logged-in admin (to hide self-actions) */
  currentUserId: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Покупатель",
  manager: "Менеджер",
  admin: "Администратор",
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("ru-KZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    customer: "bg-gray-100 text-gray-700",
    manager: "bg-blue-100 text-blue-700",
    admin: "bg-purple-100 text-purple-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        styles[role],
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ isBlocked }: { isBlocked: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        isBlocked
          ? "bg-red-100 text-red-700"
          : "bg-green-100 text-green-700",
      )}
    >
      {isBlocked ? "Заблокирован" : "Активен"}
    </span>
  );
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

  const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pageNumbers = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => startPage + i,
  ).filter((p) => p <= totalPages);

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-500">
        Страница {page} из {totalPages} ({total} пользователей)
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

export function UsersTable({ data, baseUrl, currentUserId }: UsersTableProps) {
  return (
    <div className="space-y-4">
      {/* Count */}
      <p className="text-sm text-gray-500">Найдено: {data.total}</p>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        {data.items.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            Пользователей не найдено.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Телефон</th>
                  <th className="px-4 py-3">Роль</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Дата регистрации</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((user) => {
                  const isBlocked = user.blockedAt !== null;
                  const isSelf = currentUserId === user.id;

                  return (
                    <tr key={user.id} className="group hover:bg-gray-50">
                      {/* Email */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {user.email}
                        </div>
                        {isSelf && (
                          <div className="mt-0.5 text-xs text-gray-400">
                            (вы)
                          </div>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3 text-gray-600">
                        {user.phone ?? (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <RoleBadge role={user.role} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge isBlocked={isBlocked} />
                      </td>

                      {/* Registration date */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-end gap-1.5">
                          {!isSelf && (
                            <>
                              <UserRoleSelect
                                userId={user.id}
                                currentRole={user.role}
                              />
                              <UserBlockButton
                                userId={user.id}
                                isBlocked={isBlocked}
                              />
                            </>
                          )}
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
