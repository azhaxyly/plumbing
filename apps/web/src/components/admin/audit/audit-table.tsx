/**
 * AuditTable — Server Component for the audit log table.
 * Renders table rows with action badges, diff summary, and pagination.
 * See task 29.3.
 */
import type { Route } from "next";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditLogRow {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  createdAt: Date;
  actor: { email: string } | null;
}

export interface PaginatedAuditLogs {
  items: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AuditTableProps {
  data: PaginatedAuditLogs;
  /** Base URL for pagination links (without page param) */
  baseUrl: string;
}

// ─── Label maps ───────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  create: "Создание",
  update: "Обновление",
  delete: "Удаление",
  status_change: "Смена статуса",
  role_change: "Смена роли",
  block: "Блокировка",
  unblock: "Разблокировка",
};

const ENTITY_LABELS: Record<string, string> = {
  Product: "Товар",
  Order: "Заказ",
  User: "Пользователь",
  Category: "Категория",
  Brand: "Бренд",
  Attribute: "Атрибут",
  Setting: "Настройка",
  Page: "Страница",
  Banner: "Баннер",
  Coupon: "Купон",
};

// ─── Badge colors ─────────────────────────────────────────────────────────────

const ACTION_BADGE_CLASSES: Record<string, string> = {
  create:
    "bg-green-100 text-green-800 ring-green-200",
  update:
    "bg-blue-100 text-blue-800 ring-blue-200",
  delete:
    "bg-red-100 text-red-800 ring-red-200",
  status_change:
    "bg-yellow-100 text-yellow-800 ring-yellow-200",
  role_change:
    "bg-purple-100 text-purple-800 ring-purple-200",
  block:
    "bg-red-100 text-red-800 ring-red-200",
  unblock:
    "bg-green-100 text-green-800 ring-green-200",
};

const DEFAULT_BADGE_CLASS = "bg-gray-100 text-gray-700 ring-gray-200";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/**
 * Produces a compact diff summary for the "Изменения" column.
 * - For status_change: shows "before.status → after.status"
 * - For role_change: shows "before.role → after.role"
 * - Otherwise: truncated JSON summary (max 80 chars)
 */
function formatDiff(
  action: string,
  before: unknown,
  after: unknown,
): string {
  if (action === "status_change") {
    const b = before as Record<string, unknown> | null | undefined;
    const a = after as Record<string, unknown> | null | undefined;
    const bStatus = b?.status ?? "—";
    const aStatus = a?.status ?? "—";
    return `${bStatus} → ${aStatus}`;
  }

  if (action === "role_change") {
    const b = before as Record<string, unknown> | null | undefined;
    const a = after as Record<string, unknown> | null | undefined;
    const bRole = b?.role ?? "—";
    const aRole = a?.role ?? "—";
    return `${bRole} → ${aRole}`;
  }

  if (action === "create" && after != null) {
    const summary = JSON.stringify(after);
    return summary.length > 80 ? summary.slice(0, 77) + "…" : summary;
  }

  if (action === "delete" && before != null) {
    const summary = JSON.stringify(before);
    return summary.length > 80 ? summary.slice(0, 77) + "…" : summary;
  }

  if (before != null || after != null) {
    const summary = JSON.stringify({ before, after });
    return summary.length > 80 ? summary.slice(0, 77) + "…" : summary;
  }

  return "—";
}

// ─── Action badge ─────────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  const classes =
    ACTION_BADGE_CLASSES[action] ?? DEFAULT_BADGE_CLASS;
  const label = ACTION_LABELS[action] ?? action;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${classes}`}
    >
      {label}
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
        Страница {page} из {totalPages} ({total} записей)
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

export function AuditTable({ data, baseUrl }: AuditTableProps) {
  return (
    <div className="space-y-4">
      {/* Count */}
      <p className="text-sm text-gray-500">Найдено: {data.total}</p>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        {data.items.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            Записей не найдено.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3">Пользователь</th>
                  <th className="px-4 py-3">Действие</th>
                  <th className="px-4 py-3">Сущность</th>
                  <th className="px-4 py-3">ID сущности</th>
                  <th className="px-4 py-3">Изменения</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((log) => (
                  <tr key={log.id} className="group hover:bg-gray-50">
                    {/* Date */}
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {formatDate(log.createdAt)}
                    </td>

                    {/* User */}
                    <td className="px-4 py-3">
                      {log.actor ? (
                        <span className="text-gray-900">{log.actor.email}</span>
                      ) : (
                        <span className="text-gray-400 italic">Система</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <ActionBadge action={log.action} />
                    </td>

                    {/* Entity */}
                    <td className="px-4 py-3 text-gray-700">
                      {ENTITY_LABELS[log.entity] ?? log.entity}
                    </td>

                    {/* Entity ID */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-500">
                        {log.entityId.slice(-8).toUpperCase()}
                      </span>
                    </td>

                    {/* Changes */}
                    <td className="max-w-[280px] px-4 py-3">
                      <span
                        className="block truncate text-xs text-gray-600"
                        title={formatDiff(log.action, log.before, log.after)}
                      >
                        {formatDiff(log.action, log.before, log.after)}
                      </span>
                    </td>
                  </tr>
                ))}
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
