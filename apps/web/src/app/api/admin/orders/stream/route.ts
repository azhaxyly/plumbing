/**
 * GET /api/admin/orders/stream
 *
 * Returns today's orders (newest first, limit 20) as JSON.
 * Used by the admin dashboard for polling every 15 seconds.
 *
 * Response: { orders: OrderSummary[], timestamp: string }
 *
 * Protected: only admin and manager roles.
 * See task 30.1.
 */

import { NextResponse } from "next/server";

import { prisma } from "@timsan/db";

import { auth } from "@/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderSummary {
  id: string;
  status: "new" | "confirmed" | "delivered" | "cancelled";
  contactName: string;
  contactPhone: string;
  subtotalCents: number;
  createdAt: string; // ISO string
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  // Auth check
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  const role = user?.role;

  if (!role || (role !== "admin" && role !== "manager")) {
    return NextResponse.json(
      { error: "Требуется роль admin или manager" },
      { status: 401 },
    );
  }

  // Start of today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Fetch today's orders
  const rawOrders = await prisma.order.findMany({
    where: {
      createdAt: { gte: startOfToday },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      status: true,
      contactName: true,
      contactPhone: true,
      subtotalCents: true,
      createdAt: true,
    },
  });

  const orders: OrderSummary[] = rawOrders.map((o) => ({
    id: o.id,
    status: o.status as OrderSummary["status"],
    contactName: o.contactName,
    contactPhone: o.contactPhone,
    subtotalCents: o.subtotalCents,
    createdAt: o.createdAt.toISOString(),
  }));

  return NextResponse.json({
    orders,
    timestamp: new Date().toISOString(),
  });
}
