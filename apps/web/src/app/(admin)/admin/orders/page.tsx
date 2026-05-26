/**
 * Admin orders list page — Server Component.
 *
 * Reads URL search params for filters (status, date range, sort, page),
 * fetches orders from the DB via Prisma, and renders the filter bar + table.
 *
 * See task 26.1.
 */
import type { Metadata } from "next";
import type { Prisma } from "@timsan/db";
import { prisma } from "@timsan/db";

import { OrdersFilters } from "@/components/admin/orders/orders-filters";
import type { OrderSortOption } from "@/components/admin/orders/orders-filters";
import { OrdersTable } from "@/components/admin/orders/orders-table";
import type { OrderRow } from "@/components/admin/orders/orders-table";

export const metadata: Metadata = {
  title: "Заказы — Timsan Admin",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const VALID_STATUSES = ["new", "confirmed", "delivered", "cancelled"] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidStatus(value: string): value is ValidStatus {
  return (VALID_STATUSES as readonly string[]).includes(value);
}

function parseSortOption(value: string | undefined): OrderSortOption {
  const valid: OrderSortOption[] = [
    "createdAt_desc",
    "createdAt_asc",
    "subtotal_desc",
    "subtotal_asc",
  ];
  if (value && (valid as string[]).includes(value)) {
    return value as OrderSortOption;
  }
  return "createdAt_desc";
}

function buildOrderBy(
  sort: OrderSortOption,
): { createdAt: "asc" | "desc" } | { subtotalCents: "asc" | "desc" } {
  switch (sort) {
    case "createdAt_asc":
      return { createdAt: "asc" };
    case "subtotal_desc":
      return { subtotalCents: "desc" };
    case "subtotal_asc":
      return { subtotalCents: "asc" };
    case "createdAt_desc":
    default:
      return { createdAt: "desc" };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    status?: string;
    from?: string;
    to?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Parse & validate params
  const statusParam = params.status ?? "";
  const status: ValidStatus | undefined =
    isValidStatus(statusParam) ? statusParam : undefined;

  const fromParam = params.from ?? "";
  const toParam = params.to ?? "";
  const sort = parseSortOption(params.sort);
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  // Build Prisma where clause
  const where: Prisma.OrderWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (fromParam || toParam) {
    where.createdAt = {};
    if (fromParam) {
      // Start of the "from" day
      const fromDate = new Date(fromParam);
      fromDate.setHours(0, 0, 0, 0);
      where.createdAt.gte = fromDate;
    }
    if (toParam) {
      // End of the "to" day
      const toDate = new Date(toParam);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }

  const orderBy = buildOrderBy(sort);

  // Fetch total count and page of orders in parallel
  const [total, rawOrders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        contactName: true,
        contactPhone: true,
        addressStreet: true,
        addressBuilding: true,
        addressApartment: true,
        addressCity: true,
        subtotalCents: true,
        createdAt: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const orders: OrderRow[] = rawOrders.map((o) => ({
    ...o,
    status: o.status as OrderRow["status"],
  }));

  // Build base URL for pagination (preserves all filters except page)
  const filterParams = new URLSearchParams();
  if (status) filterParams.set("status", status);
  if (fromParam) filterParams.set("from", fromParam);
  if (toParam) filterParams.set("to", toParam);
  if (sort !== "createdAt_desc") filterParams.set("sort", sort);
  const baseUrl = `/admin/orders?${filterParams.toString()}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Заказы</h1>
        <p className="mt-1 text-sm text-gray-500">
          Управление заказами покупателей
        </p>
      </div>

      {/* Filters */}
      <OrdersFilters
        currentStatus={statusParam}
        currentFrom={fromParam}
        currentTo={toParam}
        currentSort={sort}
      />

      {/* Table */}
      <OrdersTable
        data={{
          items: orders,
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
