/**
 * Cart domain types and pure computation functions.
 *
 * Business model: the customer assembles a cart and submits an order.
 * Delivery is handled by the store owner (courier on their side) — shipping
 * is always free from the system's perspective, so total === subtotal.
 *
 * All monetary values are in tiyins (minor units): 1 KZT = 100 tiyins.
 */

import { add, mul, zero, type Money } from "@timsan/shared";
import type { CartId, ProductId, UserId, VariantId } from "./types";

// ─── Cart item ID ─────────────────────────────────────────────────────────────

type Brand<T, B> = T & { readonly __brand: B };
export type CartItemId = Brand<string, "CartItemId">;

// ─── Domain interfaces ────────────────────────────────────────────────────────

/**
 * A single line item inside a cart.
 *
 * `unitPrice` is the price snapshot captured when the item was added to the
 * cart (or re-validated at checkout — see design.md → P-5).
 *
 * Product snapshot fields (`productName`, `productSku`, `productImageUrl`)
 * are denormalised here so that the cart can be rendered without an extra
 * product lookup.
 */
export interface CartItem {
  /** Unique identifier for this cart line. */
  id: CartItemId;
  /** The cart this item belongs to. */
  cartId: CartId;
  /** The specific product variant selected. */
  variantId: VariantId;
  /** The parent product. */
  productId: ProductId;
  /** Number of units; must be > 0. */
  quantity: number;
  /** Price per unit at the time the item was added (in tiyins). */
  unitPrice: Money;
  // ── Product snapshot (denormalised for display) ──────────────────────────
  /** Product name at the time of addition. */
  productName: string;
  /** Product / variant SKU at the time of addition. */
  productSku: string;
  /** Primary image URL at the time of addition (optional). */
  productImageUrl?: string;
}

/**
 * A shopping cart.
 *
 * Either `userId` (authenticated) or `guestId` (anonymous) is set — never
 * both, never neither.
 */
export interface Cart {
  id: CartId;
  /** Set for authenticated users; null for guests. */
  userId: UserId | null;
  /** Set for anonymous guests (UUID v4 stored in HttpOnly cookie); null for authenticated users. */
  guestId: string | null;
  items: CartItem[];
  /** Guest carts expire after 30 days; authenticated carts may have a longer TTL. */
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── computeTotals ────────────────────────────────────────────────────────────

/**
 * A cart item enriched with its computed line total.
 */
export interface CartItemWithTotal extends CartItem {
  /** `unitPrice × quantity` in tiyins. */
  lineTotal: Money;
}

/**
 * The result of `computeTotals`.
 *
 * Shipping is always free (the store owner handles delivery), so
 * `total === subtotal`.
 */
export interface CartTotals {
  /** Sum of all line totals (Σ unitPrice × quantity). */
  subtotal: Money;
  /** Total number of individual units across all items. */
  itemCount: number;
  /** Items enriched with their individual line totals. */
  items: CartItemWithTotal[];
}

/**
 * Computes cart totals from a list of cart items.
 *
 * This is a **pure function** — it has no side effects and always returns the
 * same result for the same input.
 *
 * Preconditions (asserted at runtime):
 *   - `items` must be a non-empty array
 *   - every item's `quantity` must be > 0
 *   - every item's `unitPrice.amount` must be >= 0 (integer)
 *
 * Postconditions:
 *   - `subtotal.amount === Σ (unitPrice[i].amount × quantity[i])`
 *   - `itemCount === Σ quantity[i]`
 *   - all amounts are non-negative integers
 *   - delivery is free → total === subtotal (no separate total field needed)
 *
 * @throws {RangeError} if any precondition is violated
 */
export function computeTotals(items: CartItem[]): CartTotals {
  // ── Preconditions ──────────────────────────────────────────────────────────
  if (items.length === 0) {
    throw new RangeError("computeTotals: items must not be empty");
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) {
      throw new RangeError(`computeTotals: items[${i}] is undefined`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new RangeError(
        `computeTotals: items[${i}].quantity must be a positive integer, got: ${item.quantity}`
      );
    }
    if (
      !Number.isInteger(item.unitPrice.amount) ||
      item.unitPrice.amount < 0
    ) {
      throw new RangeError(
        `computeTotals: items[${i}].unitPrice.amount must be a non-negative integer, got: ${item.unitPrice.amount}`
      );
    }
  }

  // ── Computation ────────────────────────────────────────────────────────────
  let subtotal: Money = zero("KZT");
  let itemCount = 0;
  const enrichedItems: CartItemWithTotal[] = [];

  for (const item of items) {
    const lineTotal = mul(item.unitPrice, item.quantity);
    subtotal = add(subtotal, lineTotal);
    itemCount += item.quantity;
    enrichedItems.push({ ...item, lineTotal });
  }

  return {
    subtotal,
    itemCount,
    items: enrichedItems,
  };
}
