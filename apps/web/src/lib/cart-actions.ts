"use server";

/**
 * Server Actions for cart operations.
 *
 * Implements:
 *   - addToCart: adds a product variant to the cart (guest or authenticated)
 *   - mergeGuestCartOnLogin: migrates guest Redis cart into the user's DB cart on login
 *
 * See design.md → «Корзина гостя», task 19.3.
 */

import { cookies } from "next/headers";
import {
  getGuestCart,
  deleteGuestCart,
  CART_GUEST_COOKIE,
} from "@/lib/cart-redis";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartActionResult {
  success: boolean;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getPrisma() {
  const { prisma } = await import("@timsan/db");
  return prisma;
}

/** 90 days from now for authenticated users */
function userExpiry(): Date {
  return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Ensures the cartGuestId cookie is set.
 * Called from the client after cart.add succeeds, so the cookie
 * is available for subsequent SSR renders of /cart.
 *
 * @param guestId - UUID v4 to store in the cookie
 */
export async function ensureGuestCartCookie(guestId: string): Promise<void> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CART_GUEST_COOKIE)?.value;
  if (!existing) {
    cookieStore.set(CART_GUEST_COOKIE, guestId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      secure: process.env["NODE_ENV"] === "production",
    });
  }
}

/**
 * Adds a product to the user's wishlist.
 *
 * @param productId - The ID of the product to add to wishlist
 *
 * TODO (Phase 3+): Implement real wishlist logic — persist to DB for
 * authenticated users, store in localStorage/cookie for guests.
 */
export async function addToWishlist(productId: string): Promise<void> {
  console.log("[addToWishlist] stub called", { productId });
}

/**
 * Merges the guest Redis cart into the authenticated user's DB cart.
 *
 * Merge policy:
 *   - If a variantId already exists in the user's cart → sum quantities
 *   - Otherwise → add as a new item
 *
 * After merge:
 *   - Deletes the Redis key `cart:{guestId}`
 *   - Clears the `cartGuestId` cookie
 *
 * Called from the auth callback after successful login.
 *
 * @param userId  - The authenticated user's ID
 */
export async function mergeGuestCartOnLogin(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const guestId = cookieStore.get(CART_GUEST_COOKIE)?.value;

  if (!guestId) {
    // No guest cart cookie — nothing to merge
    return;
  }

  const guestCart = await getGuestCart(guestId);
  if (!guestCart || guestCart.items.length === 0) {
    // Empty or missing guest cart — just clean up the cookie
    cookieStore.delete(CART_GUEST_COOKIE);
    return;
  }

  const prisma = await getPrisma();

  // Find or create the user's DB cart
  let dbCart = await prisma.cart.findFirst({
    where: { userId, expiresAt: { gt: new Date() } },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  if (!dbCart) {
    dbCart = await prisma.cart.create({
      data: {
        userId,
        expiresAt: userExpiry(),
      },
      include: { items: true },
    });
  }

  // Merge guest items into DB cart
  for (const guestItem of guestCart.items) {
    const existingItem = dbCart.items.find(
      (item) => item.variantId === guestItem.variantId,
    );

    if (existingItem) {
      // Sum quantities for matching variantId
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + guestItem.quantity },
      });
    } else {
      // Add as new item
      await prisma.cartItem.create({
        data: {
          cartId: dbCart.id,
          variantId: guestItem.variantId as string,
          productId: guestItem.productId as string,
          quantity: guestItem.quantity,
          unitPriceCents: guestItem.unitPrice.amount,
          productName: guestItem.productName,
          productSku: guestItem.productSku,
          ...(guestItem.productImageUrl !== undefined
            ? { productImageUrl: guestItem.productImageUrl }
            : {}),
        },
      });
    }
  }

  // Touch cart updatedAt
  await prisma.cart.update({
    where: { id: dbCart.id },
    data: { updatedAt: new Date() },
  });

  // Clean up: delete Redis key and clear cookie
  await deleteGuestCart(guestId);
  cookieStore.delete(CART_GUEST_COOKIE);
}
