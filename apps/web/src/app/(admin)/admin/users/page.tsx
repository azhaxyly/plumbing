/**
 * Admin users list page — Server Component.
 *
 * Reads URL search params for filters (role, status, page),
 * fetches users from the DB via Prisma, and renders the filter bar + table.
 *
 * See task 27.
 */
import type { Prisma } from "@timsan/db";
import { prisma } from "@timsan/db";
import type { Metadata } from "next";

import { auth } from "@/auth";
import { UsersFilters } from "@/components/admin/users/users-filters";
import { UsersTable } from "@/components/admin/users/users-table";
import type { UserRow } from "@/components/admin/users/users-table";

export const metadata: Metadata = {
  title: "Пользователи — Timsan Admin",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const VALID_ROLES = ["customer", "manager", "admin"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidRole(value: string): value is ValidRole {
  return (VALID_ROLES as readonly string[]).includes(value);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    role?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Parse & validate params
  const roleParam = params.role ?? "";
  const statusParam = params.status ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const role: ValidRole | undefined =
    isValidRole(roleParam) ? roleParam : undefined;

  // Build Prisma where clause
  const where: Prisma.UserWhereInput = {};

  if (role) {
    where.role = role;
  }

  if (statusParam === "active") {
    where.blockedAt = null;
  } else if (statusParam === "blocked") {
    where.blockedAt = { not: null };
  }

  // Fetch total count and page of users in parallel
  const [total, rawUsers] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        blockedAt: true,
        createdAt: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const users: UserRow[] = rawUsers.map((u) => ({
    ...u,
    role: u.role as UserRow["role"],
  }));

  // Get current session to identify self
  const session = await auth();
  const currentUserId =
    (session?.user as { id?: string } | undefined)?.id ?? null;

  // Build base URL for pagination (preserves all filters except page)
  const filterParams = new URLSearchParams();
  if (role) filterParams.set("role", role);
  if (statusParam && statusParam !== "all") filterParams.set("status", statusParam);
  const baseUrl = `/admin/users?${filterParams.toString()}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Пользователи</h1>
        <p className="mt-1 text-sm text-gray-500">
          Управление пользователями и их ролями
        </p>
      </div>

      {/* Filters */}
      <UsersFilters
        currentRole={roleParam}
        currentStatus={statusParam}
      />

      {/* Table */}
      <UsersTable
        data={{
          items: users,
          total,
          page,
          limit: PAGE_SIZE,
          totalPages,
        }}
        baseUrl={baseUrl}
        currentUserId={currentUserId}
      />
    </div>
  );
}
