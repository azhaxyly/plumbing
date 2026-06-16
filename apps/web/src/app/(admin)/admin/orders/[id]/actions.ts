"use server";

/**
 * Server Actions for order detail page.
 * Handles manual status transitions with audit logging.
 *
 * See task 26.3.
 */

import { prisma } from "@timsan/db";
import { canTransition } from "@timsan/domain";

import { auth } from "@/auth";
import type { OrderStatus } from "@/components/admin/orders/order-status-badge";
import { audit } from "@/lib/audit";


// ─── transitionOrderStatus ────────────────────────────────────────────────────

/**
 * Transitions an order to a new status.
 *
 * Validates:
 * - User is authenticated and has admin or manager role
 * - The transition is allowed by the state machine
 *
 * Writes an AuditLog entry on success.
 */
export async function transitionOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
): Promise<{ success: boolean; error?: string }> {
  // ── Auth check ─────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Не авторизован" };
  }

  const user = session.user as { id?: string; role?: string };
  const role = user.role ?? "customer";

  if (role !== "admin" && role !== "manager") {
    return { success: false, error: "Недостаточно прав" };
  }

  const actorUserId = user.id ?? null;

  // ── Fetch current order ────────────────────────────────────────────────────
  let order: { status: string } | null;
  try {
    order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
  } catch {
    return { success: false, error: "Ошибка при получении заказа" };
  }

  if (!order) {
    return { success: false, error: "Заказ не найден" };
  }

  const oldStatus = order.status as OrderStatus;

  // ── Validate transition ────────────────────────────────────────────────────
  if (!canTransition(oldStatus, newStatus)) {
    return {
      success: false,
      error: `Переход из "${oldStatus}" в "${newStatus}" не разрешён`,
    };
  }

  // ── Update order + stock in one transaction ────────────────────────────────
  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      });

      // Decrement stock when order is confirmed.
      // OrderItem.variantId is a snapshot, not an FK — the variant may have been
      // deleted/re-created since the order was placed. Use updateMany so a missing
      // variant affects 0 rows instead of throwing and rolling back the whole tx.
      if (newStatus === "confirmed") {
        const items = await tx.orderItem.findMany({
          where: { orderId },
          select: { variantId: true, quantity: true },
        });
        for (const item of items) {
          const res = await tx.productVariant.updateMany({
            where: { id: item.variantId },
            data: { quantity: { decrement: item.quantity } },
          });
          if (res.count === 0) {
            console.warn(
              `[transitionOrderStatus] Variant ${item.variantId} not found for order ${orderId}; skipping stock decrement`,
            );
          }
        }
      }

      // Restore stock when confirmed order is cancelled
      if (newStatus === "cancelled" && oldStatus === "confirmed") {
        const items = await tx.orderItem.findMany({
          where: { orderId },
          select: { variantId: true, quantity: true },
        });
        for (const item of items) {
          const res = await tx.productVariant.updateMany({
            where: { id: item.variantId },
            data: { quantity: { increment: item.quantity } },
          });
          if (res.count === 0) {
            console.warn(
              `[transitionOrderStatus] Variant ${item.variantId} not found for order ${orderId}; skipping stock restore`,
            );
          }
        }
      }
    });
  } catch {
    return { success: false, error: "Ошибка при обновлении статуса" };
  }

  // ── Audit log ──────────────────────────────────────────────────────────────
  await audit({
    actorUserId,
    action: "status_change",
    entity: "Order",
    entityId: orderId,
    before: { status: oldStatus },
    after: { status: newStatus },
  });

  return { success: true };
}
