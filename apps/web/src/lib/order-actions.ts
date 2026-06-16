"use server";

/**
 * submitOrder — creates an Order from a Cart in a single Prisma transaction.
 *
 * Steps:
 *   1. Load the Cart + CartItems from DB by cartId.
 *   2. Assert the cart is not empty.
 *   3. In one transaction:
 *      a. Create Order (status=new) with contact/address/totals snapshot.
 *      b. Create OrderItem for each CartItem (price/name/sku/image snapshot).
 *      c. Delete all CartItems and touch Cart.updatedAt.
 *   4. Return { orderId }.
 *
 * See design.md → «Алгоритм submitOrder», task 21.1.
 */

import { computeTotals } from "@timsan/domain";
import type { CartItem, CartItemId, CartId, VariantId, ProductId } from "@timsan/domain";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ContactInfo {
  name: string;
  phone: string;
}

export interface DeliveryAddress {
  street: string;
  building: string;
  apartment?: string;
  city?: string;
}

export interface SubmitOrderResult {
  orderId: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getPrisma() {
  const { prisma } = await import("@timsan/db");
  return prisma;
}

// ─── submitOrder ──────────────────────────────────────────────────────────────

/**
 * Creates an Order from the given cart in a single atomic transaction.
 *
 * @param cartId      - The DB cart ID to convert into an order.
 * @param contactInfo - Customer name and phone (snapshot).
 * @param address     - Delivery address (snapshot).
 * @param comment     - Optional order comment.
 * @param userId      - Authenticated user ID (null for guests).
 * @param guestId     - Guest UUID from cookie (null for authenticated users).
 * @returns           - The newly created order ID.
 * @throws {Error}    - If the cart is empty or not found.
 */
export async function submitOrder(
  cartId: string,
  contactInfo: ContactInfo,
  address: DeliveryAddress,
  comment?: string,
  userId?: string | null,
  guestId?: string | null,
): Promise<SubmitOrderResult> {
  const prisma = await getPrisma();

  // ── 0. Fetch user email for notification snapshot ──────────────────────────
  let contactEmail: string | null = null;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    contactEmail = user?.email ?? null;
  }

  // ── 1. Load cart from DB ───────────────────────────────────────────────────
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: true },
  });

  if (!cart) {
    throw new Error(`submitOrder: cart not found (cartId=${cartId})`);
  }

  // ── 2. Assert cart is not empty ────────────────────────────────────────────
  if (cart.items.length === 0) {
    throw new Error("submitOrder: cannot submit an empty cart");
  }

  // ── Compute totals using domain function ───────────────────────────────────
  const domainItems: CartItem[] = cart.items.map((item) => ({
    id: item.id as CartItemId,
    cartId: item.cartId as CartId,
    variantId: item.variantId as VariantId,
    productId: item.productId as ProductId,
    quantity: item.quantity,
    unitPrice: { amount: item.unitPriceCents, currency: "KZT" as const },
    productName: item.productName,
    productSku: item.productSku,
    ...(item.productImageUrl !== null
      ? { productImageUrl: item.productImageUrl }
      : {}),
  }));

  const totals = computeTotals(domainItems);

  // ── 3. Atomic transaction ──────────────────────────────────────────────────
  const order = await prisma.$transaction(async (tx) => {
    // a. Create Order
    const newOrder = await tx.order.create({
      data: {
        userId: userId ?? null,
        guestId: guestId ?? null,
        status: "new",
        contactName: contactInfo.name,
        contactPhone: contactInfo.phone,
        contactEmail: contactEmail,
        addressStreet: address.street,
        addressBuilding: address.building,
        addressApartment: address.apartment ?? null,
        addressCity: address.city ?? "Алматы",
        comment: comment ?? null,
        consentGiven: true,
        consentAt: new Date(),
        subtotalCents: totals.subtotal.amount,
      },
    });

    // b. Create OrderItems (price/name/sku/image snapshot)
    await tx.orderItem.createMany({
      data: cart.items.map((item) => ({
        orderId: newOrder.id,
        variantId: item.variantId,
        productId: item.productId,
        nameSnapshot: item.productName,
        skuSnapshot: item.productSku,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        imageUrlSnapshot: item.productImageUrl ?? null,
      })),
    });

    // c. Clear cart: delete all CartItems, touch Cart.updatedAt
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });

    return newOrder;
  });

  // ── 4. Enqueue notification (fire-and-forget, after COMMIT) ───────────────
  // Non-critical: if enqueueing fails the order is already saved.
  // The notification can be retried later via reconciliation.
  try {
    const { enqueueOrderCreated } = await import("@/lib/notification-queue");
    await enqueueOrderCreated(order.id);
  } catch (err) {
    console.error("[submitOrder] Failed to enqueue order.created notification:", err);
  }

  return { orderId: order.id };
}
