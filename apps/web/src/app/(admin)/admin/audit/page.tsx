/**
 * Admin audit log page — Server Component.
 *
 * Reads URL search params for filters (entity, action, date range, page),
 * fetches AuditLog entries from the DB via Prisma, and renders the filter bar + table.
 *
 * See task 29.3.
 */
import type { Metadata } from "next";
import type { Prisma } from "@timsan/db";
import { prisma } from "@timsan/db";

import { AuditFilters } from "@/components/admin/audit/audit-filters";
import { AuditTable } from "@/components/admin/audit/audit-table";
import type { AuditLogRow } from "@/components/admin/audit/audit-table";

export const metadata: Metadata = {
  title: "Аудит — Timsan Admin",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 30;

const VALID_ENTITIES = [
  "Product",
  "Order",
  "User",
  "Category",
  "Brand",
  "Attribute",
  "Setting",
  "Page",
  "Banner",
  "Coupon",
] as const;

const VALID_ACTIONS = [
  "create",
  "update",
  "delete",
  "status_change",
  "role_change",
  "block",
  "unblock",
] as const;

type ValidEntity = (typeof VALID_ENTITIES)[number];
type ValidAction = (typeof VALID_ACTIONS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidEntity(value: string): value is ValidEntity {
  return (VALID_ENTITIES as readonly string[]).includes(value);
}

function isValidAction(value: string): value is ValidAction {
  return (VALID_ACTIONS as readonly string[]).includes(value);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    entity?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Parse & validate params
  const entityParam = params.entity ?? "";
  const actionParam = params.action ?? "";
  const fromParam = params.from ?? "";
  const toParam = params.to ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const entity: ValidEntity | undefined =
    isValidEntity(entityParam) ? entityParam : undefined;
  const action: ValidAction | undefined =
    isValidAction(actionParam) ? actionParam : undefined;

  // Build Prisma where clause
  const where: Prisma.AuditLogWhereInput = {};

  if (entity) {
    where.entity = entity;
  }

  if (action) {
    where.action = action;
  }

  if (fromParam || toParam) {
    where.createdAt = {};
    if (fromParam) {
      const fromDate = new Date(fromParam);
      fromDate.setHours(0, 0, 0, 0);
      where.createdAt.gte = fromDate;
    }
    if (toParam) {
      const toDate = new Date(toParam);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }

  // Fetch total count and page of audit logs in parallel
  const [total, rawLogs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        actor: {
          select: { email: true },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const logs: AuditLogRow[] = rawLogs.map((log) => ({
    id: log.id,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    before: log.before,
    after: log.after,
    createdAt: log.createdAt,
    actor: log.actor ?? null,
  }));

  // Build base URL for pagination (preserves all filters except page)
  const filterParams = new URLSearchParams();
  if (entity) filterParams.set("entity", entity);
  if (action) filterParams.set("action", action);
  if (fromParam) filterParams.set("from", fromParam);
  if (toParam) filterParams.set("to", toParam);
  const qs = filterParams.toString();
  const baseUrl = `/admin/audit${qs ? `?${qs}` : ""}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Аудит</h1>
        <p className="mt-1 text-sm text-gray-500">
          История действий администраторов и менеджеров
        </p>
      </div>

      {/* Filters */}
      <AuditFilters
        currentEntity={entityParam}
        currentAction={actionParam}
        currentFrom={fromParam}
        currentTo={toParam}
      />

      {/* Table */}
      <AuditTable
        data={{
          items: logs,
          total,
          page,
          limit: PAGE_SIZE,
          totalPages,
        }}
        baseUrl={baseUrl}
      />
    </div>
  );
}
